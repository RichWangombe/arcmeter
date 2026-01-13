# x402 Canonical Reference

## What x402 is

x402 is an HTTP 402 Payment Required protocol that turns API access errors into paid access flows. Clients receive payment terms in a 402 response, create proofs, and retry to access the resource.

## Canonical flow

1. **Client** requests a protected resource.
2. **Seller** responds `402` with `PAYMENT-REQUIRED` header containing base64-encoded `PaymentTerms`.
3. **Client** creates a `PaymentProof` and retries with `PAYMENT-SIGNATURE` header.
4. **Facilitator** verifies the proof against the terms and settles the payment.
5. **Seller** stores a `Receipt` and returns the resource with `PAYMENT-RESPONSE` header.

## Normative (must match)

- **Headers**
  - `PAYMENT-REQUIRED`
  - `PAYMENT-SIGNATURE`
  - `PAYMENT-RESPONSE`
- **Schemas** (see `packages/shared/src/x402/`)
  - `PaymentTerms`
  - `PaymentProof`
  - `Receipt`
- **Encoding**: base64 JSON for all header payloads

## Flexible (implementation choice)

- Verifier backend (local HMAC, Circle, or other facilitator)
- Settlement rail (USDC on-chain, off-chain, or demo)
- Agent decision logic (AI, budget policy, or static)

## Who this repo is for

- **API sellers**: Add x402 paywalls to existing services
- **Agent builders**: Build clients that can pay for access
- **Protocol evaluators**: Reference implementation for x402 v2

## How to adopt

1. Copy schemas and header constants from `packages/shared/src/x402/`.
2. Issue 402 with `PAYMENT-REQUIRED` when a resource is protected.
3. Verify incoming `PAYMENT-SIGNATURE` via a facilitator.
4. Return the resource with `PAYMENT-RESPONSE` on success.

Any implementation following these schemas and headers will be compatible with ArcMeter and the broader x402 ecosystem.
