# ArcMeter: x402 Reference Implementation

## Problem

APIs today rely on API keys for access control. For AI agents, this breaks down: keys are static, can’t enforce per-request budgets, and don’t provide audit trails. Developers need a way to charge agents per-request without managing user accounts.

## Why x402

x402 turns HTTP 402 Payment Required into a standard paywall protocol. Sellers issue payment terms; agents create proofs; facilitators verify and settle. This enables:
- Per-request pricing and budget enforcement
- Cryptographic proofs instead of static keys
- Built-in audit receipts

## Why Arc + USDC + Circle

- **ArcMeter** provides a full reference implementation (seller, facilitator, agent, UI) so developers can adopt x402 without guessing.
- **USDC** is the de facto stablecoin for on-chain payments, with fast settlement and low fees.
- **Circle** provides the facilitator infrastructure to verify proofs and settle USDC at scale.

## Why a reference beats a SaaS demo

A reference implementation is force-multiplier:
- Developers copy schemas and examples, not sign up for a service.
- Judges can see the protocol end-to-end, not a black box.
- The ecosystem grows faster when the contract is open and explicit.

## What we built

- Canonical x402 schemas and headers
- Minimal Express seller example
- Minimal Node agent client
- Full facilitator with local demo verifier and upstream proxy
- Next.js dashboard to run agents and view receipts
- Deterministic demo script

## Result

ArcMeter makes x402 unavoidable for anyone building paid APIs for AI agents.
