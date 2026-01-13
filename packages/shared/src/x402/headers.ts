/**
 * x402 HTTP transport headers (canonical reference)
 *
 * These are the exact header names used by ArcMeter and aligned with the x402 v2 spec.
 * Any client or server implementing x402 should use these constants to avoid typos.
 */
export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";
