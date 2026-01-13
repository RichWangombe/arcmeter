import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import {
  createLogger,
  decodeBase64Json,
  verifyLocalDemoProof
} from "@arcmeter/shared";
import type {
  LocalDemoProof,
  PaymentPayload,
  PaymentRequirements,
  PaymentTerms,
  SettleResponse,
  VerifyResponse,
  VerifyResult
} from "@arcmeter/shared";

const log = createLogger("facilitator");

const PORT = Number(process.env.FACILITATOR_PORT || 3002);
const LOCAL_DEMO_VERIFIER_SECRET = process.env.LOCAL_DEMO_VERIFIER_SECRET || "change-me";
const UPSTREAM_VERIFY_ENDPOINT = process.env.X402_VERIFY_ENDPOINT || "";
const UPSTREAM_SETTLE_ENDPOINT = process.env.X402_SETTLE_ENDPOINT || "";

type VerifyRequestBody = {
  termsB64: string;
  proofB64: string;
};

type X402VerifyRequestBody = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

function verifyFromBody(body: VerifyRequestBody): VerifyResult {
  const terms = decodeBase64Json<PaymentTerms>(body.termsB64);
  const proof = decodeBase64Json<LocalDemoProof>(body.proofB64);
  return verifyLocalDemoProof({ proof, terms, secret: LOCAL_DEMO_VERIFIER_SECRET });
}

function parseLocalDemoX402(body: X402VerifyRequestBody):
  | { ok: true; terms: PaymentTerms; proof: LocalDemoProof }
  | { ok: false; invalidReason: string } {
  const payload = body.paymentPayload.payload as Partial<LocalDemoProof>;
  if (!payload || payload.kind !== "local_demo_hmac_v1") {
    return { ok: false, invalidReason: "unsupported_scheme" };
  }

  if (!payload.requestId || !payload.payer || !payload.issuedAt || !payload.sig) {
    return { ok: false, invalidReason: "invalid_payload" };
  }

  const ext = body.paymentPayload.extensions as
    | { arcmeter?: { termsB64?: string } }
    | undefined;
  const termsB64 = ext?.arcmeter?.termsB64;
  if (!termsB64) return { ok: false, invalidReason: "missing_terms" };
  const terms = decodeBase64Json<PaymentTerms>(termsB64);

  if (terms.requestId !== payload.requestId) return { ok: false, invalidReason: "request_id_mismatch" };
  if (terms.currency !== "USDC") return { ok: false, invalidReason: "currency_mismatch" };
  if (terms.chainId !== body.paymentRequirements.network) return { ok: false, invalidReason: "invalid_network" };
  if (terms.recipient !== body.paymentRequirements.payTo) return { ok: false, invalidReason: "invalid_recipient" };
  const expectedAtomic = Math.round(terms.amountUsd * 1_000_000).toString();
  if (body.paymentRequirements.amount !== expectedAtomic) {
    return { ok: false, invalidReason: "amount_mismatch" };
  }

  const proof = payload as LocalDemoProof;
  if (proof.amountUsd !== terms.amountUsd) return { ok: false, invalidReason: "amount_mismatch" };

  return { ok: true, terms, proof };
}

function verifyFromX402Body(body: X402VerifyRequestBody): VerifyResponse {
  const parsed = parseLocalDemoX402(body);
  if (!parsed.ok) return { isValid: false, invalidReason: parsed.invalidReason };
  const res = verifyLocalDemoProof({ proof: parsed.proof, terms: parsed.terms, secret: LOCAL_DEMO_VERIFIER_SECRET });
  if (!res.ok) return { isValid: false, invalidReason: res.error };
  return { isValid: true, payer: res.payer };
}

async function postUpstream<T>(url: string, body: unknown): Promise<T> {
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

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    mode: UPSTREAM_VERIFY_ENDPOINT ? "upstream" : "local_demo",
    time: new Date().toISOString()
  });
});

app.get("/supported", (_req: Request, res: Response) => {
  res.json({
    kinds: [
      {
        x402Version: 2,
        scheme: "local_demo",
        network: "local"
      }
    ],
    extensions: [],
    signers: {}
  });
});

app.post("/verify", (req: Request, res: Response) => {
  try {
    const legacy = req.body as Partial<VerifyRequestBody>;
    if (legacy.termsB64 && legacy.proofB64) {
      const result = verifyFromBody({ termsB64: legacy.termsB64, proofB64: legacy.proofB64 });
      if (!result.ok) {
        res.json({ isValid: false, invalidReason: result.error });
        return;
      }
      res.json({ isValid: true, payer: result.payer } satisfies VerifyResponse);
      return;
    }

    const body = req.body as Partial<X402VerifyRequestBody>;
    if (!body.paymentPayload || !body.paymentRequirements) {
      res.status(400).json({ isValid: false, invalidReason: "invalid_request" } satisfies VerifyResponse);
      return;
    }

    if (UPSTREAM_VERIFY_ENDPOINT) {
      postUpstream<VerifyResponse>(UPSTREAM_VERIFY_ENDPOINT, {
        paymentPayload: body.paymentPayload,
        paymentRequirements: body.paymentRequirements
      })
        .then((out) => res.json(out))
        .catch((err) => {
          log.error("upstream_verify_failed", { err: String(err) });
          res.status(502).json({ isValid: false, invalidReason: "upstream_verify_failed" } satisfies VerifyResponse);
        });
      return;
    }

    res.json(verifyFromX402Body({
      paymentPayload: body.paymentPayload,
      paymentRequirements: body.paymentRequirements
    }));
  } catch (err) {
    log.error("verify_failed", { err: String(err) });
    res.status(500).json({ isValid: false, invalidReason: "unexpected_verify_error" } satisfies VerifyResponse);
  }
});

app.post("/settle", (req: Request, res: Response) => {
  try {
    const legacy = req.body as Partial<VerifyRequestBody>;
    if (legacy.termsB64 && legacy.proofB64) {
      const result = verifyFromBody({ termsB64: legacy.termsB64, proofB64: legacy.proofB64 });
      if (!result.ok) {
        res.json({
          success: false,
          errorReason: result.error,
          payer: "",
          transaction: "",
          network: "local"
        } satisfies SettleResponse);
        return;
      }

      res.json({
        success: true,
        payer: result.payer,
        transaction: result.txHash,
        network: "local"
      } satisfies SettleResponse);
      return;
    }

    const body = req.body as Partial<X402VerifyRequestBody>;
    if (!body.paymentPayload || !body.paymentRequirements) {
      res.status(400).json({
        success: false,
        errorReason: "invalid_request",
        payer: "",
        transaction: "",
        network: ""
      } satisfies SettleResponse);
      return;
    }

    if (UPSTREAM_SETTLE_ENDPOINT) {
      postUpstream<SettleResponse>(UPSTREAM_SETTLE_ENDPOINT, {
        paymentPayload: body.paymentPayload,
        paymentRequirements: body.paymentRequirements
      })
        .then((out) => res.json(out))
        .catch((err) => {
          log.error("upstream_settle_failed", { err: String(err) });
          res.status(502).json({
            success: false,
            errorReason: "upstream_settle_failed",
            payer: "",
            transaction: "",
            network: body.paymentRequirements?.network || ""
          } satisfies SettleResponse);
        });
      return;
    }

    const vr = verifyFromX402Body({
      paymentPayload: body.paymentPayload,
      paymentRequirements: body.paymentRequirements
    });

    if (!vr.isValid) {
      res.json({
        success: false,
        errorReason: vr.invalidReason || "invalid_payload",
        payer: vr.payer,
        transaction: "",
        network: body.paymentRequirements.network
      } satisfies SettleResponse);
      return;
    }

    const parsed = parseLocalDemoX402({
      paymentPayload: body.paymentPayload,
      paymentRequirements: body.paymentRequirements
    });
    if (!parsed.ok) {
      res.json({
        success: false,
        errorReason: parsed.invalidReason,
        payer: vr.payer,
        transaction: "",
        network: body.paymentRequirements.network
      } satisfies SettleResponse);
      return;
    }

    const verified = verifyLocalDemoProof({
      proof: parsed.proof,
      terms: parsed.terms,
      secret: LOCAL_DEMO_VERIFIER_SECRET
    });
    if (!verified.ok) {
      res.json({
        success: false,
        errorReason: verified.error,
        payer: "",
        transaction: "",
        network: body.paymentRequirements.network
      } satisfies SettleResponse);
      return;
    }

    res.json({
      success: true,
      payer: verified.payer,
      transaction: verified.txHash,
      network: body.paymentRequirements.network
    } satisfies SettleResponse);
  } catch (err) {
    log.error("settle_failed", { err: String(err) });
    res.status(500).json({
      success: false,
      errorReason: "unexpected_settle_error",
      payer: "",
      transaction: "",
      network: ""
    } satisfies SettleResponse);
  }
});

app.listen(PORT, () => {
  log.info("listening", { port: PORT });
});
