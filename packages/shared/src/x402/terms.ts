/**
 * x402 PaymentTerms schema (canonical reference)
 *
 * Defines the terms a seller issues for a protected resource.
 * Must be signed by the client in a PaymentProof and verified by the facilitator.
 */
export interface PaymentTerms {
  /** Unique request identifier, must be bound to proof */
  requestId: string;
  /** Price in USD for this request */
  amountUsd: number;
  /** Currency code (always USDC in ArcMeter) */
  currency: "USDC";
  /** Chain/network identifier; "local" for demo mode */
  chainId: "local" | string;
  /** Recipient identifier */
  recipient: string;
  /** ISO 8601 expiry time */
  expiresAt: string;
  /** Resource URL being protected */
  resource: string;
}
