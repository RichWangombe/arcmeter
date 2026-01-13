# 90-Second Judge Video Script

## 0:00–0:15 – Intro
> “ArcMeter is the canonical x402 reference. It turns HTTP 402 into paid access for AI agents.”

- Show repo root
- Show `X402-CANON.md` open
- Say: “Sellers issue terms; agents prove payment; facilitators settle.”

## 0:15–0:30 – Seller 402
> “Watch a seller return 402 with payment terms.”

- Terminal: `curl -i http://localhost:4000/protected`
- Highlight `PAYMENT-REQUIRED` header
- Say: “The client now knows exactly what to pay.”

## 0:30–0:45 – Agent pays
> “Our agent creates a proof and retries.”

- Terminal: `cd examples/agent-client && npx tsx index.ts`
- Show logs: “Generated proof (requestId)… Retrying… ✅ Success!”
- Say: “Proof is verified; resource is returned.”

## 0:45–1:00 – Receipt trail
> “Every payment creates a receipt.”

- Terminal: `curl http://localhost:4000/receipts`
- Show JSON with `txHash`, `payer`, `amountUsd`
- Say: “Built-in audit trail.”

## 1:00–1:15 – Real mode toggle
> “Switch from demo HMAC to Circle gateway.”

- Show `.env` with `X402_VERIFY_ENDPOINT` commented out
- Say: “Uncomment to use real Circle verification.”
- Show dashboard banner: `MODE: Local Demo (HMAC)`

## 1:15–1:30 – Call to action
> “ArcMeter makes x402 unavoidable.”

- Show `examples/` folder
- Say: “Copy the 45-line seller or agent and start charging APIs today.”

---

## Fallback (if UI flakes)

- Use only curl + agent-client terminal commands
- No browser needed; all headers and JSON visible
