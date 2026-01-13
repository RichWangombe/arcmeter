/**
 * Minimal x402 agent client (Node + fetch)
 * Demonstrates: 402 → terms → proof → retry → receipt
 * Run: npx tsx index.ts
 */
import crypto from "node:crypto";
import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_RESPONSE_HEADER
} from "@arcmeter/shared/x402/headers";
import {
  createLocalDemoProof,
  decodeBase64Json,
  encodeBase64Json
} from "@arcmeter/shared";
import type {
  LocalDemoProof,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  PaymentTerms,
  SettleResponse
} from "@arcmeter/shared";

const SELLER_URL = "http://localhost:4000/protected";
const DEMO_SECRET = process.env.LOCAL_DEMO_VERIFIER_SECRET || "change-me";
const AGENT_ID = process.env.AGENT_PAYER || "demo_agent";

async function run() {
  console.log("Requesting protected resource...");
  const res1 = await fetch(SELLER_URL);
  if (res1.status !== 402) {
    console.log("Expected 402, got", res1.status);
    return;
  }

  const requiredB64 = res1.headers.get(PAYMENT_REQUIRED_HEADER);
  if (!requiredB64) throw new Error("Missing PAYMENT-REQUIRED header");
  const pr = decodeBase64Json<PaymentRequired>(requiredB64);

  const accepted = pr.accepts?.[0] as PaymentRequirements | undefined;
  if (!accepted) throw new Error("No accepts in PaymentRequired");

  const ext = pr.extensions as { arcmeter?: { termsB64?: string } } | undefined;
  const termsB64 = ext?.arcmeter?.termsB64;
  if (!termsB64) throw new Error("Missing extensions.arcmeter.termsB64");
  const terms = decodeBase64Json<PaymentTerms>(termsB64);

  const proof: LocalDemoProof = createLocalDemoProof({
    terms,
    payer: AGENT_ID,
    secret: DEMO_SECRET
  });

  const paymentPayload: PaymentPayload = {
    x402Version: 2,
    resource: pr.resource,
    accepted,
    payload: proof as unknown as Record<string, unknown>,
    extensions: { arcmeter: { termsB64 } }
  };

  const paymentSigB64 = encodeBase64Json(paymentPayload);
  console.log("Retrying with PAYMENT-SIGNATURE...");
  const res2 = await fetch(SELLER_URL, {
    headers: { [PAYMENT_SIGNATURE_HEADER]: paymentSigB64 }
  });
  if (!res2.ok) {
    console.log("Retry failed:", res2.status, await res2.text());
    return;
  }

  const responseB64 = res2.headers.get(PAYMENT_RESPONSE_HEADER);
  const response = responseB64 ? decodeBase64Json<SettleResponse>(responseB64) : null;
  const body = await res2.json().catch(() => ({}));
  console.log("Success! Resource body:", body);
  console.log("PAYMENT-RESPONSE:", response);
}

run().catch(console.error);
