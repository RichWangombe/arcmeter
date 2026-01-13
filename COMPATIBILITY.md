# x402 Compatibility Matrix

| Component          | ArcMeter Implementation | Minimal Example | Compatible |
| ----------------- | --------------------- | --------------- | ---------- |
| Seller            | seller-api            | express-seller  | ✅ |
| Buyer             | agent-buyer           | agent-client    | ✅ |
| Facilitator       | facilitator           | —              | ✅ |

## Interoperability guarantee

Any seller that emits **Canon Terms** and uses the **Canon Headers** can be paid by any buyer that follows **Canon Proof** and **Canon Headers**.

- **Canon Terms**: `PaymentTerms` schema in `packages/shared/src/x402/terms.ts`
- **Canon Proof**: `PaymentProof` schema in `packages/shared/src/x402/proof.ts`
- **Canon Headers**: `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` in `packages/shared/src/x402/headers.ts`

If both sides use these schemas and headers, they will interoperate with ArcMeter and any other x402-compliant implementation.
