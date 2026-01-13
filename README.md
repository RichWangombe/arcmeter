# ArcMeter

ArcMeter is a monorepo demonstrating an end-to-end **x402 HTTP 402 paywall** with:
- A seller API that issues payment requirements and verifies proofs
- A facilitator service that verifies and settles payments (local demo verifier or upstream proxy)
- An AI agent buyer that decides whether to pay and retries automatically
- A Next.js dashboard to run agents, view receipts, and toggle seller modes

## Architecture

```
┌─ apps/web (Next.js dashboard, :3000)
│   └─ app/api/* proxies to services
├─ services/
│   ├─ seller-api (:3001)
│   ├─ facilitator (:3002)
│   └─ agent-buyer (:3003)
└─ packages/shared (x402 types, logger, utils)
```

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Copy env (defaults work for local demo)
cp .env.example .env

# 3. Start all services in parallel
pnpm dev
```

Open http://localhost:3000 to use the dashboard.

## Services

### Seller API (:3001)
- `GET /signal` – returns 402 with `PAYMENT-REQUIRED` header unless a valid proof is provided
- `GET /health` – returns health and price-raise mode state
- `POST /admin/price-mode` – toggle price-raise mode (requires `x-admin-secret`)
- `GET /admin/receipts` – list receipts (requires `x-admin-secret`)

### Facilitator (:3002)
- `POST /verify` – verifies a payment payload (local demo HMAC or upstream proxy)
- `POST /settle` – settles a payment (local demo HMAC or upstream proxy)
- `GET /health` – health check
- `GET /supported` – returns supported schemes

### Agent Buyer (:3003)
- `POST /run` – runs one end-to-end paywall flow (402 handling, decision, payment, retry)
- `GET /runs` – list runs
- `GET /runs/:runId` – get run details with event log
- `GET /health` – health check

### Web Dashboard (:3000)
- Live health/status view for all services
- Run the agent buyer with configurable spend/prompt
- View receipts ledger and run logs
- Toggle seller price-raise mode

## Environment

See `.env.example`. Key variables:
- `LOCAL_DEMO_VERIFIER_SECRET` – secret for local HMAC verifier
- `SELLER_ADMIN_SECRET` – admin secret for seller API
- `GEMINI_API_KEY` – optional: enables AI decision-making; otherwise uses simple budget policy
- `X402_VERIFY_ENDPOINT` / `X402_SETTLE_ENDPOINT` – optional: enable upstream proxy mode
- `AGENT_BUYER_BASE_URL`, `SELLER_BASE_URL`, `FACILITATOR_BASE_URL` – service URLs

## Reference

See `packages/shared/src/x402/` for canonical schemas and headers.

### Minimal example

```bash
cd examples/express-seller
pnpm install
npx tsx index.ts
```

A 45-line seller that issues 402s and verifies proofs using the reference schemas.

## License

MIT
