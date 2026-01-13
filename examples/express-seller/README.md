# Minimal Express x402 Seller

A 45-line reference implementation showing how to issue 402 responses, verify proofs, and return protected resources using the ArcMeter x402 schemas.

## Run

```bash
npx tsx index.ts
```

## What it does

1. `GET /protected` returns 402 with `PAYMENT-REQUIRED` header unless a valid `PAYMENT-SIGNATURE` is provided.
2. Decodes the base64 JSON proof and validates against the expected terms.
3. Returns 200 with `PAYMENT-RESPONSE` header and a mock receipt on success.

## Copy-paste this

- The header constants (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`)
- The schemas (`PaymentTerms`, `PaymentProof`)
- The base64 encode/decode helpers

Replace the mock verification with a real facilitator call in production.
