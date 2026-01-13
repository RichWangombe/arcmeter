import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import {
  createLogger,
  decodeBase64Json,
  encodeBase64Json,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_SIGNATURE_HEADER
} from "@arcmeter/shared";
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  PaymentTerms,
  SettleResponse,
  VerifyResponse
} from "@arcmeter/shared";
import {
  addReceipt,
  getState,
  putTerms,
  setPriceRaiseMode,
  listReceipts
} from "./store.js";

const log = createLogger("seller-api");

const PORT = Number(process.env.SELLER_PORT || 3001);
const DB_PATH = process.env.SELLER_DB_PATH || "./data/seller.json";
const DEFAULT_PRICE_USD = Number(process.env.SELLER_DEFAULT_PRICE_USD || 0.01);
const PRICE_RAISE_MODE_ENV = (process.env.SELLER_PRICE_RAISE_MODE || "false").toLowerCase() === "true";
const ADMIN_SECRET = process.env.SELLER_ADMIN_SECRET || "dev-secret";
const CLIENT_ID_HEADER = process.env.SELLER_CLIENT_ID_HEADER || "X-CLIENT-ID";
const FACILITATOR_BASE_URL = process.env.FACILITATOR_BASE_URL || "http://localhost:3002";

function getPriceUsd(priceRaiseMode: boolean): number {
  if (priceRaiseMode) return Math.max(DEFAULT_PRICE_USD * 50, 0.5);
  return DEFAULT_PRICE_USD;
}

function requirementsFor(priceUsd: number): PaymentRequirements {
  const amountAtomic = Math.round(priceUsd * 1_000_000).toString();
  return {
    scheme: "local_demo",
    network: "local",
    amount: amountAtomic,
    asset: "USDC",
    payTo: "demo_seller",
    maxTimeoutSeconds: 60,
    extra: { name: "USDC", version: "2" }
  };
}

function makeTerms(params: { priceUsd: number; req: Request }): { terms: PaymentTerms; termsB64: string } {
  const requestId = crypto.randomUUID();
  const resourceUrl = `${params.req.protocol}://${params.req.get("host")}${params.req.originalUrl}`;
  const terms: PaymentTerms = {
    requestId,
    amountUsd: params.priceUsd,
    currency: "USDC",
    chainId: "local",
    recipient: "demo_seller",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    resource: resourceUrl
  };

  return { terms, termsB64: encodeBase64Json(terms) };
}

function makePaymentRequired(params: {
  req: Request;
  priceUsd: number;
  termsB64: string;
}): PaymentRequired {
  const resourceUrl = `${params.req.protocol}://${params.req.get("host")}${params.req.originalUrl}`;
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: resourceUrl,
      description: "ArcMeter paid signal",
      mimeType: "application/json"
    },
    accepts: [requirementsFor(params.priceUsd)],
    extensions: {
      arcmeter: {
        termsB64: params.termsB64
      }
    }
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json()) as T;
  return json;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req: Request, res: Response) => {
  const state = await getState({ dbPath: DB_PATH });
  res.json({ ok: true, priceRaiseMode: state.priceRaiseMode, envDefault: PRICE_RAISE_MODE_ENV });
});

app.get("/signal", async (req: Request, res: Response) => {
  const state = await getState({ dbPath: DB_PATH });
  const priceUsd = getPriceUsd(state.priceRaiseMode);

  const paymentSig = req.header(PAYMENT_SIGNATURE_HEADER);
  if (!paymentSig) {
    const { terms, termsB64 } = makeTerms({ priceUsd, req });
    await putTerms({ dbPath: DB_PATH, requestId: terms.requestId, termsB64 });

    const pr = makePaymentRequired({ req, priceUsd, termsB64 });
    res.status(402);
    res.setHeader(PAYMENT_REQUIRED_HEADER, encodeBase64Json(pr));
    res.json({ error: "payment_required" });
    return;
  }

  let paymentPayload: PaymentPayload;
  try {
    paymentPayload = decodeBase64Json<PaymentPayload>(paymentSig);
  } catch {
    res.status(400).json({ error: "invalid_payment_signature" });
    return;
  }

  const accepted = paymentPayload.accepted;
  const verifyUrl = `${FACILITATOR_BASE_URL}/verify`;
  const settleUrl = `${FACILITATOR_BASE_URL}/settle`;

  const vr = await postJson<VerifyResponse>(verifyUrl, {
    paymentPayload,
    paymentRequirements: accepted
  });

  if (!vr.isValid) {
    const price = getPriceUsd(state.priceRaiseMode);
    const { terms, termsB64 } = makeTerms({ priceUsd: price, req });
    await putTerms({ dbPath: DB_PATH, requestId: terms.requestId, termsB64 });
    const pr = makePaymentRequired({ req, priceUsd: price, termsB64 });
    res.status(402);
    res.setHeader(PAYMENT_REQUIRED_HEADER, encodeBase64Json(pr));
    res.json({ error: "payment_invalid", reason: vr.invalidReason || "invalid" });
    return;
  }

  const sr = await postJson<SettleResponse>(settleUrl, {
    paymentPayload,
    paymentRequirements: accepted
  });

  if (!sr.success) {
    res.status(402).json({ error: "settlement_failed", reason: sr.errorReason || "failed" });
    return;
  }

  const clientId = req.header(CLIENT_ID_HEADER) || undefined;
  const proof = paymentPayload.payload as Record<string, unknown>;

  await addReceipt({
    dbPath: DB_PATH,
    row: {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      requestId: (proof["requestId"] as string) || "",
      payer: sr.payer || vr.payer || "",
      amountUsd: Number((proof["amountUsd"] as number) || 0),
      txHash: sr.transaction,
      rawSettlement: sr,
      clientId
    }
  });

  res.setHeader("PAYMENT-RESPONSE", encodeBase64Json(sr));
  res.json({
    ok: true,
    signal: { score: 0.73, label: "ARC_MOMENTUM" },
    txHash: sr.transaction,
    payer: sr.payer,
    accepted
  });
});

app.post("/admin/price-mode", async (req: Request, res: Response) => {
  const secret = req.header("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const enabled = Boolean((req.body as { enabled?: unknown })?.enabled);
  const state = await setPriceRaiseMode({ dbPath: DB_PATH, enabled });
  res.json({ ok: true, state });
});

app.get("/admin/receipts", async (req: Request, res: Response) => {
  const secret = req.header("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({ receipts: await listReceipts({ dbPath: DB_PATH }) });
});

app.listen(PORT, () => {
  log.info("listening", { port: PORT });
});
