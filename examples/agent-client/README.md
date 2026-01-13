# Minimal x402 Agent Client

A 45-line Node client that:
1. Calls a protected endpoint and receives a 402 with terms
2. Creates a local demo proof
3. Retries with `PAYMENT-SIGNATURE`
4. Receives the resource and `PAYMENT-RESPONSE`

## Run

```bash
npx tsx index.ts
```

Requires the Express seller example running on :4000.

## What to copy

- Header constants (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`)
- Schemas (`PaymentTerms`, `PaymentProof`)
- Base64 encode/decode helpers
- Local demo HMAC proof creation

Replace the mock proof with real facilitator calls in production.
