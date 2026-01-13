/**
 * Minimal Express seller using x402 reference schemas
 * Run: npx tsx index.ts
 */
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_RESPONSE_HEADER
} from "@arcmeter/shared";
import { encodeBase64Json, decodeBase64Json } from "@arcmeter/shared";
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  PaymentTerms,
  SettleResponse,
  VerifyResponse
} from "@arcmeter/shared";

const app = express();
app.use(cors());
app.use(express.json());

const PRICE_USD = 0.01;
const FACILITATOR_BASE_URL = process.env.FACILITATOR_BASE_URL || "http://localhost:3002";

const receipts: Array<{
  id: string;
  createdAt: string;
  requestId: string;
  payer: string;
  amountUsd: number;
  txHash: string;
}> = [];

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

function makeTerms(req: Request, priceUsd: number): { terms: PaymentTerms; termsB64: string } {
  const requestId = crypto.randomUUID();
  const terms: PaymentTerms = {
    requestId,
    amountUsd: priceUsd,
    currency: "USDC",
    chainId: "local",
    recipient: "demo_seller",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`
  };
  return { terms, termsB64: encodeBase64Json(terms) };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return (await res.json()) as T;
}

app.get("/protected", async (req: Request, res: Response) => {
  const paymentSig = req.header(PAYMENT_SIGNATURE_HEADER);
  if (!paymentSig) {
    const { terms, termsB64 } = makeTerms(req, PRICE_USD);
    const required: PaymentRequired = {
      x402Version: 2,
      error: "PAYMENT-SIGNATURE header is required",
      resource: {
        url: terms.resource,
        description: "Demo protected resource",
        mimeType: "application/json"
      },
      accepts: [requirementsFor(PRICE_USD)],
      extensions: {
        arcmeter: {
          termsB64
        }
      }
    };
    res.status(402);
    res.setHeader(PAYMENT_REQUIRED_HEADER, encodeBase64Json(required));
    return res.json({ error: "payment_required" });
  }

  let paymentPayload: PaymentPayload;
  try {
    paymentPayload = decodeBase64Json<PaymentPayload>(paymentSig);
  } catch {
    return res.status(400).json({ error: "invalid_payment_signature" });
  }

  const accepted: PaymentRequirements = paymentPayload.accepted;
  const verifyUrl = `${FACILITATOR_BASE_URL}/verify`;
  const settleUrl = `${FACILITATOR_BASE_URL}/settle`;

  const vr = await postJson<VerifyResponse>(verifyUrl, {
    paymentPayload,
    paymentRequirements: accepted
  });
  if (!vr.isValid) {
    return res.status(402).json({ error: "payment_invalid", reason: vr.invalidReason || "invalid" });
  }

  const sr = await postJson<SettleResponse>(settleUrl, {
    paymentPayload,
    paymentRequirements: accepted
  });
  if (!sr.success) {
    return res.status(402).json({ error: "settlement_failed", reason: sr.errorReason || "failed" });
  }

  receipts.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    requestId: (paymentPayload.payload as any)?.requestId || "",
    payer: sr.payer || vr.payer || "",
    amountUsd: Number((paymentPayload.payload as any)?.amountUsd || 0),
    txHash: sr.transaction
  });

  res.setHeader(PAYMENT_RESPONSE_HEADER, encodeBase64Json(sr));
  return res.json({ ok: true, data: "protected_resource", receipt: receipts[0] });
});

app.get("/receipts", (_req: Request, res: Response) => {
  res.json({ receipts });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Demo seller listening on :${PORT}`));
