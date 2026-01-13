/**
 * x402 Receipt schema (canonical reference)
 *
 * Server-side record after successful verification and settlement.
 * Used for audit trails and customer proof-of-payment.
 */
export interface Receipt {
  /** Unique receipt identifier */
  id: string;
  /** ISO 8601 creation time */
  createdAt: string;
  /** Bound PaymentTerms.requestId */
  requestId: string;
  /** Payer from the proof */
  payer: string;
  /** Paid amount */
  amountUsd: number;
  /** Settlement transaction hash */
  txHash: string;
  /** Optional client identifier */
  clientId?: string;
  /** Raw facilitator settlement response */
  rawSettlement?: unknown;
}
