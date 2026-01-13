/**
 * x402 PaymentProof schema (canonical reference)
 *
 * Client-signed proof that it accepted the PaymentTerms and fulfilled payment.
 * Serialized into base64 and sent via PAYMENT-SIGNATURE header.
 */
export interface PaymentProof {
  /** Must match PaymentTerms.requestId */
  requestId: string;
  /** Payer identifier */
  payer: string;
  /** Must match PaymentTerms.amountUsd */
  amountUsd: number;
  /** Must match PaymentTerms.currency */
  currency: "USDC";
  /** Transaction hash or settlement identifier */
  txHash?: string;
  /** Optional on-chain metadata */
  metadata?: Record<string, unknown>;
}
