# x402 Reference Implementation

This directory contains the **canonical schemas and constants** for the x402 HTTP 402 protocol as implemented by ArcMeter. Use these types and headers to ensure compatibility.

## Files

- `headers.ts` – exact HTTP header names
- `terms.ts` – PaymentTerms schema issued by sellers
- `proof.ts` – PaymentProof schema created by clients
- `receipt.ts` – Receipt schema stored by sellers after settlement

## Usage

```ts
import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_RESPONSE_HEADER
} from "@arcmeter/shared/x402/headers";
import type { PaymentTerms } from "@arcmeter/shared/x402/terms";
import type { PaymentProof } from "@arcmeter/shared/x402/proof";
import type { Receipt } from "@arcmeter/shared/x402/receipt";
```

## Flow

1. **Seller** issues `PaymentTerms` and returns 402 with `PAYMENT-REQUIRED` header (base64 JSON).
2. **Client** creates `PaymentProof` and sends request with `PAYMENT-SIGNATURE` header (base64 JSON).
3. **Facilitator** verifies the proof against the terms and settles the payment.
4. **Seller** stores a `Receipt` and returns the protected resource with `PAYMENT-RESPONSE` header.

Any implementation that follows these schemas and headers will work with ArcMeter.
