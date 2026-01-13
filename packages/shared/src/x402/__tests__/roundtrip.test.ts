/**
 * Roundtrip contract test: Terms → Proof → Receipt
 * Ensures schemas are consistent and encode/decode works end-to-end.
 */
import { encodeBase64Json, decodeBase64Json } from "../../x402.js";
import type { PaymentTerms } from "../terms.js";
import type { PaymentProof } from "../proof.js";
import type { Receipt } from "../receipt.js";

const requestId = crypto.randomUUID();

const terms: PaymentTerms = {
  requestId,
  amountUsd: 0.01,
  currency: "USDC",
  chainId: "local",
  recipient: "demo_seller",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  resource: "https://example.com/protected"
};

const proof: PaymentProof = {
  requestId,
  payer: "demo_agent",
  amountUsd: 0.01,
  currency: "USDC",
  txHash: "demo_tx_hash"
};

const receipt: Receipt = {
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  requestId,
  payer: proof.payer,
  amountUsd: proof.amountUsd,
  txHash: proof.txHash!,
  clientId: "demo_client"
};

// Encode → decode roundtrip
const termsB64 = encodeBase64Json(terms);
const proofB64 = encodeBase64Json(proof);
const receiptB64 = encodeBase64Json(receipt);

const decodedTerms = decodeBase64Json<PaymentTerms>(termsB64);
const decodedProof = decodeBase64Json<PaymentProof>(proofB64);
const decodedReceipt = decodeBase64Json<Receipt>(receiptB64);

// Invariants
if (decodedTerms.requestId !== decodedProof.requestId) {
  throw new Error("requestId mismatch between terms and proof");
}
if (decodedTerms.amountUsd !== decodedProof.amountUsd) {
  throw new Error("amountUsd mismatch between terms and proof");
}
if (decodedProof.requestId !== decodedReceipt.requestId) {
  throw new Error("requestId mismatch between proof and receipt");
}
if (decodedProof.amountUsd !== decodedReceipt.amountUsd) {
  throw new Error("amountUsd mismatch between proof and receipt");
}

console.log("✅ Roundtrip contract test passed");
