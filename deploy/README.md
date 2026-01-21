# Fly.io + Vercel Deployment (Testnet-Ready)

This setup deploys the three services to Fly.io and the web app to Vercel.
It runs in local-demo mode until Circle sandbox credentials are added.

## 1) Fly apps (services)

From the repo root:

```bash
fly auth login
fly apps create arcmeter-facilitator
fly apps create arcmeter-seller
fly apps create arcmeter-agent
```

Create the seller volume (for receipts/state):

```bash
fly volumes create seller_data --app arcmeter-seller --size 1 --region iad
```

## 2) Secrets (local demo mode)

Use the same local verifier secret for facilitator + agent.

```bash
fly secrets set LOCAL_DEMO_VERIFIER_SECRET=CHANGE_ME_STRONG --app arcmeter-facilitator
fly secrets set LOCAL_DEMO_VERIFIER_SECRET=CHANGE_ME_STRONG --app arcmeter-agent
```

Set the seller admin secret:

```bash
fly secrets set SELLER_ADMIN_SECRET=CHANGE_ME_STRONG --app arcmeter-seller
```

## 3) Deploy services

```bash
fly deploy -c deploy/fly.facilitator.toml
fly deploy -c deploy/fly.seller.toml
fly deploy -c deploy/fly.agent.toml
```

## 4) Vercel (web)

In Vercel project settings, set:

```
NEXT_PUBLIC_SELLER_BASE_URL=https://arcmeter-seller.fly.dev
NEXT_PUBLIC_AGENT_BASE_URL=https://arcmeter-agent.fly.dev
FACILITATOR_BASE_URL=https://arcmeter-facilitator.fly.dev
SELLER_BASE_URL=https://arcmeter-seller.fly.dev
SELLER_ADMIN_SECRET=CHANGE_ME_STRONG
```

## 5) Switch to Circle sandbox (later)

Once you have Circle sandbox credentials:

```bash
fly secrets set CIRCLE_API_KEY=... --app arcmeter-facilitator
fly secrets set CIRCLE_ENV=sandbox --app arcmeter-facilitator
fly secrets set CIRCLE_WALLET_ID=... --app arcmeter-facilitator
fly secrets set CIRCLE_ENTITY_SECRET=... --app arcmeter-facilitator
fly secrets set GATEWAY_BASE_URL=... --app arcmeter-facilitator
fly secrets set X402_VERIFY_ENDPOINT=... --app arcmeter-facilitator
fly secrets set X402_SETTLE_ENDPOINT=... --app arcmeter-facilitator
fly secrets set X402_FACILITATOR_SECRET=... --app arcmeter-facilitator
```

Then redeploy the facilitator and refresh the dashboard.

## Notes

- For zero-cost mode, keep `auto_stop_machines = true`.
- For live demos, set `min_machines_running = 1` to avoid cold starts.
