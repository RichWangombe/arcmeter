# ArcMeter Demo Guide

This guide walks through a live x402 paywall demo using the ArcMeter monorepo.

## Prerequisites

- `pnpm` installed
- ArcMeter repo cloned and `pnpm install` run
- All services running (`pnpm dev`)

## Step 1: Open the dashboard

Navigate to http://localhost:3000. You should see:
- Health indicators for seller, facilitator, and agent
- Seller Controls (price-raise mode toggle)
- Agent Buyer form
- Recent Runs and Receipts sections (empty initially)

## Step 2: Observe a 402 response

Use `curl` or the browser to visit the seller’s signal endpoint:

```bash
curl -i http://localhost:3001/signal
```

You’ll receive:
- Status `402 Payment Required`
- `PAYMENT-REQUIRED` header with base64-encoded `PaymentRequired` payload
- JSON body with an error message

## Step 3: Run the agent buyer

From the dashboard:
1. Keep defaults: Goal `get_signal`, Max spend `0.05`, Confidence `0.5`
2. Click **Run**.

The agent will:
- Call `/signal` and receive the 402
- Decode the `PAYMENT-REQUIRED` payload
- Decide to pay (uses budget policy unless `GEMINI_API_KEY` is set)
- Create a local demo proof (HMAC-signed using `LOCAL_DEMO_VERIFIER_SECRET`)
- Retry `/signal` with `PAYMENT-SIGNATURE` header
- Receive a successful `200` with a signal and `PAYMENT-RESPONSE` header

You’ll see:
- Run Output JSON with the successful response
- A new entry in Recent Runs
- A new receipt in the Receipts Ledger

## Step 4: Toggle price-raise mode

In Seller Controls:
1. Click **Enable**.
2. Run the agent again with the same spend limit.

The agent will now **abstain** because the price exceeds the budget. You’ll see an ABSTAINED decision in the run log.

## Step 5: Inspect logs and receipts

- Click any run in **Recent Runs** to view its full event log.
- The **Receipts Ledger** shows all successful payments with `txHash`, `payer`, and `amountUsd`.

## Optional: Real verifier mode

If you set `X402_VERIFY_ENDPOINT` and `X402_SETTLE_ENDPOINT` in `.env`, the facilitator will proxy verification/settlement to an upstream x402 facilitator instead of using the local HMAC verifier.

## Troubleshooting

- Services not starting? Ensure ports 3000–3003 are free.
- Agent always abstains? Increase `maxSpendUsd` or disable price-raise mode.
- Missing headers? Check that `SELLER_ADMIN_SECRET` and `LOCAL_DEMO_VERIFIER_SECRET` match between services.
