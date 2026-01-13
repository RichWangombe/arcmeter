# ArcMeter Demo Script (Minute-by-Minute)

Run this when presenting ArcMeter. It is deterministic and idiot-proof.

## Prerequisites

- ArcMeter services running (`pnpm dev`)
- Dashboard open at http://localhost:3000

## Script

### 0:00–0:30 – Open dashboard and explain paywall

> “We’re about to demonstrate x402: HTTP 402 Payment Required. The agent will try to access a paid signal.”

- Open http://localhost:3000
- Show health indicators (all ok)
- Point to Seller Controls: price-raise mode currently disabled

### 0:30–1:00 – First 402 and agent decision

> “The agent requests the signal and receives a 402 with payment terms.”

- Click **Run** with defaults (goal=get_signal, maxSpend=0.05)
- Observe Run Output: decision=PAY, reason=fallback_policy_price_within_budget
- Explain: “The agent will now create a local demo proof and retry.”

### 1:00–1:30 – Payment and receipt

> “Proof is verified; the seller returns the signal and stores a receipt.”

- Show Run Output: ok=true, txHash=demo_tx, signal={score:0.73,label:ARC_MOMENTUM}
- Show Receipts Ledger: new entry with amountUsd=0.01, payer=demo_agent
- Explain: “The paywall is satisfied; the resource is now accessible.”

### 1:30–2:00 – High-price mode and abstain

> “Now we enable price-raise mode. The same agent will refuse to pay.”

- In Seller Controls, click **Enable** (price-raise mode now true)
- Click **Run** again with same spend limit
- Observe Run Output: decision=ABSTAIN, reason=fallback_policy_price_exceeds_budget
- Explain: “The agent protects its budget; no payment is made.”

### 2:00–2:30 – Wrap-up

> “ArcMeter demonstrates the full loop: 402 issuance, proof creation, verification, settlement, and audit trail.”

- Show selected run details: event log with RUN_STARTED, PAYMENT_CREATED, RECEIVED_200
- Recap: “This is how x402 turns HTTP errors into paid access without API keys.”

## Reset

> “To repeat the demo, toggle price-raise mode back to disabled.”

- Click **Disable** in Seller Controls
- Optional: run once more to show a successful payment

---

### Why this works

- **Deterministic**: Same inputs always produce the same on-screen result.
- **Visual**: Headers and JSON are shown in the UI, not hidden.
- **Self-contained**: No external wallets or keys are required in local demo mode.
