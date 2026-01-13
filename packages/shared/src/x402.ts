import crypto from "node:crypto";
import type { LocalDemoProof, PaymentTerms, VerifyResult } from "./types.js";
import { nowIso } from "./time.js";

export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";
export const X402_REQUEST_ID_HEADER = "X402-Request-Id";
export const X402_PROOF_HEADER = "X402-Proof";

export function encodeBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodeBase64Json<T>(encoded: string): T {
  const raw = Buffer.from(encoded, "base64").toString("utf8");
  return JSON.parse(raw) as T;
}

export function canonicalTermsString(terms: PaymentTerms): string {
  return [
    terms.requestId,
    terms.amountUsd.toFixed(6),
    terms.currency,
    terms.chainId,
    terms.recipient,
    terms.expiresAt,
    terms.resource
  ].join("|");
}

export function localDemoHmac(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function createLocalDemoProof(params: {
  terms: PaymentTerms;
  payer: string;
  secret: string;
}): LocalDemoProof {
  const issuedAt = nowIso();
  const message = [canonicalTermsString(params.terms), params.payer, issuedAt].join("|");
  const sig = localDemoHmac(params.secret, message);
  return {
    kind: "local_demo_hmac_v1",
    requestId: params.terms.requestId,
    payer: params.payer,
    amountUsd: params.terms.amountUsd,
    currency: "USDC",
    issuedAt,
    sig
  };
}

export function verifyLocalDemoProof(params: {
  proof: LocalDemoProof;
  terms: PaymentTerms;
  secret: string;
}): VerifyResult {
  if (params.proof.kind !== "local_demo_hmac_v1") return { ok: false, error: "unsupported_proof_kind" };
  if (params.proof.requestId !== params.terms.requestId) return { ok: false, error: "request_id_mismatch" };
  if (params.proof.amountUsd !== params.terms.amountUsd) return { ok: false, error: "amount_mismatch" };
  if (params.proof.currency !== "USDC") return { ok: false, error: "currency_mismatch" };

  const message = [canonicalTermsString(params.terms), params.proof.payer, params.proof.issuedAt].join("|");
  const expected = localDemoHmac(params.secret, message);
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(params.proof.sig, "hex"))) {
    return { ok: false, error: "bad_signature" };
  }

  const hash = crypto
    .createHash("sha256")
    .update(`${params.proof.kind}|${params.proof.requestId}|${params.proof.payer}|${params.proof.sig}`)
    .digest("hex")
    .slice(0, 64);

  return {
    ok: true,
    txHash: `local_${hash}`,
    payer: params.proof.payer,
    amountUsd: params.proof.amountUsd,
    currency: "USDC",
    timestamp: nowIso(),
    raw: params.proof
  };
}
