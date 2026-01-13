import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import {
  createLocalDemoProof,
  createLogger,
  decodeBase64Json,
  encodeBase64Json,
  nowIso,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_SIGNATURE_HEADER
} from "@arcmeter/shared";
import type {
  AgentDecision,
  AgentRunRequest,
  AgentRunResponse,
  LocalDemoProof,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  PaymentTerms
} from "@arcmeter/shared";
import { appendEvent, getRun, listRuns, newRun, setRunResult } from "./store.js";

const log = createLogger("agent-buyer");

const PORT = Number(process.env.AGENT_PORT || 3003);
const SELLER_BASE_URL = process.env.SELLER_BASE_URL || "http://localhost:3001";
const LOCAL_DEMO_VERIFIER_SECRET = process.env.LOCAL_DEMO_VERIFIER_SECRET || "change-me";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";
const AGENT_MAX_DAILY_SPEND_USD = Number(process.env.AGENT_MAX_DAILY_SPEND_USD || 2.0);

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; headers: Headers; json: any }> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, json };
}

function atomicToUsd(amountAtomic: string): number {
  const n = Number(amountAtomic);
  if (!Number.isFinite(n)) return NaN;
  return n / 1_000_000;
}

async function decide(params: {
  runId: string;
  maxSpendUsd: number;
  priceUsd: number;
  confidenceMin: number;
  prompt?: string;
}): Promise<AgentDecision> {
  if (!GEMINI_API_KEY) {
    if (params.priceUsd <= params.maxSpendUsd) {
      return {
        decision: "PAY",
        reason: "fallback_policy_price_within_budget",
        maxAcceptablePriceUsd: params.maxSpendUsd,
        source: "fallback"
      };
    }
    return {
      decision: "ABSTAIN",
      reason: "fallback_policy_price_exceeds_budget",
      maxAcceptablePriceUsd: params.maxSpendUsd,
      source: "fallback"
    };
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              params.prompt ||
              `You are an automated buyer agent. Decide PAY or ABSTAIN. PriceUSD=${params.priceUsd}. MaxSpendUSD=${params.maxSpendUsd}. Reply with JSON {"decision":"PAY"|"ABSTAIN","reason":"...","maxAcceptablePriceUsd":number}.`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    return {
      decision: "ABSTAIN",
      reason: `gemini_error_${res.status}`,
      maxAcceptablePriceUsd: params.maxSpendUsd,
      source: "fallback"
    };
  }

  const json = (await res.json()) as any;
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  try {
    const parsed = JSON.parse(text) as { decision: "PAY" | "ABSTAIN"; reason: string; maxAcceptablePriceUsd: number };
    return {
      decision: parsed.decision,
      reason: parsed.reason,
      maxAcceptablePriceUsd: parsed.maxAcceptablePriceUsd,
      source: "gemini",
      model: GEMINI_MODEL,
      rawText: text
    };
  } catch {
    return {
      decision: "ABSTAIN",
      reason: "gemini_unparseable_response",
      maxAcceptablePriceUsd: params.maxSpendUsd,
      source: "gemini",
      model: GEMINI_MODEL,
      rawText: text
    };
  }
}

function buildLocalDemoPayment(params: {
  pr: PaymentRequired;
  reqUrl: string;
  payer: string;
  terms: PaymentTerms;
  termsB64: string;
  accepted: PaymentRequirements;
}): { paymentPayload: PaymentPayload; paymentSigB64: string; proof: LocalDemoProof } {
  const proof = createLocalDemoProof({ terms: params.terms, payer: params.payer, secret: LOCAL_DEMO_VERIFIER_SECRET });
  const paymentPayload: PaymentPayload = {
    x402Version: 2,
    resource: params.pr.resource,
    accepted: params.accepted,
    payload: proof as unknown as Record<string, unknown>,
    extensions: {
      arcmeter: {
        termsB64: params.termsB64
      }
    }
  };
  const paymentSigB64 = encodeBase64Json(paymentPayload);
  return { paymentPayload, paymentSigB64, proof };
}

async function runOnce(req: AgentRunRequest): Promise<AgentRunResponse> {
  const run = newRun();
  const runId = run.runId;

  appendEvent(runId, { ts: nowIso(), type: "RUN_STARTED", data: { goal: req.goal } });

  const url = `${SELLER_BASE_URL}/signal`;
  appendEvent(runId, { ts: nowIso(), type: "FETCH_1", data: { url } });

  const first = await fetchJson(url, { method: "GET" });
  if (first.status !== 402) {
    appendEvent(runId, { ts: nowIso(), type: "ERROR", data: { error: "expected_402", status: first.status, body: first.json } });
    setRunResult(runId, { result: first.json });
    return {
      runId,
      decisionLog: run.log,
      spentUsd: run.spentUsd,
      result: first.json
    };
  }

  const requiredB64 = first.headers.get(PAYMENT_REQUIRED_HEADER) || "";
  if (!requiredB64) {
    appendEvent(runId, { ts: nowIso(), type: "ERROR", data: { error: "missing_payment_required_header" } });
    return { runId, decisionLog: run.log, spentUsd: run.spentUsd };
  }

  const pr = decodeBase64Json<PaymentRequired>(requiredB64);
  appendEvent(runId, { ts: nowIso(), type: "RECEIVED_402", data: { accepts: pr.accepts?.length || 0 } });

  const accepted = pr.accepts?.[0];
  if (!accepted) {
    appendEvent(runId, { ts: nowIso(), type: "ERROR", data: { error: "no_accepts" } });
    return { runId, decisionLog: run.log, spentUsd: run.spentUsd };
  }

  const priceUsd = atomicToUsd(accepted.amount);
  const ext = pr.extensions as { arcmeter?: { termsB64?: string } } | undefined;
  const termsB64 = ext?.arcmeter?.termsB64;
  if (!termsB64) {
    appendEvent(runId, { ts: nowIso(), type: "ERROR", data: { error: "missing_terms" } });
    return { runId, decisionLog: run.log, spentUsd: run.spentUsd };
  }

  const terms = decodeBase64Json<PaymentTerms>(termsB64);

  const d = await decide({
    runId,
    maxSpendUsd: Math.min(req.maxSpendUsd, AGENT_MAX_DAILY_SPEND_USD),
    priceUsd,
    confidenceMin: req.confidenceMin,
    prompt: req.prompt
  });

  appendEvent(runId, { ts: nowIso(), type: "DECISION", data: d as unknown as Record<string, unknown> });

  if (d.decision !== "PAY") {
    appendEvent(runId, { ts: nowIso(), type: "ABSTAINED", data: { reason: d.reason, priceUsd } });
    setRunResult(runId, { result: { abstained: true, reason: d.reason } });
    return { runId, decisionLog: run.log, spentUsd: run.spentUsd, result: { abstained: true, reason: d.reason } };
  }

  const payer = process.env.AGENT_PAYER || "demo_agent";
  const { paymentSigB64, proof } = buildLocalDemoPayment({
    pr,
    reqUrl: url,
    payer,
    terms,
    termsB64,
    accepted
  });

  appendEvent(runId, { ts: nowIso(), type: "PAYMENT_CREATED", data: { payer, requestId: proof.requestId, amountUsd: proof.amountUsd } });

  appendEvent(runId, { ts: nowIso(), type: "FETCH_2", data: { url } });
  const second = await fetchJson(url, {
    method: "GET",
    headers: {
      [PAYMENT_SIGNATURE_HEADER]: paymentSigB64,
      "X-CLIENT-ID": `agent_${crypto.randomUUID()}`
    }
  });

  if (second.status !== 200) {
    appendEvent(runId, { ts: nowIso(), type: "ERROR", data: { error: "expected_200", status: second.status, body: second.json } });
    setRunResult(runId, { result: second.json });
    return { runId, decisionLog: run.log, spentUsd: run.spentUsd, result: second.json };
  }

  appendEvent(runId, { ts: nowIso(), type: "RECEIVED_200", data: { ok: true } });

  const txHash = second.json?.txHash || "";
  setRunResult(runId, {
    spentUsd: proof.amountUsd,
    result: second.json,
    receipt: {
      requestId: proof.requestId,
      txHash,
      payer,
      amountUsd: proof.amountUsd,
      currency: "USDC",
      verifiedAt: nowIso(),
      rawProofJson: proof
    }
  });

  return {
    runId,
    decisionLog: run.log,
    spentUsd: proof.amountUsd,
    result: second.json,
    receipt: {
      requestId: proof.requestId,
      txHash,
      payer,
      amountUsd: proof.amountUsd,
      currency: "USDC",
      verifiedAt: nowIso(),
      rawProofJson: proof
    }
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/runs", (_req: Request, res: Response) => {
  res.json({ runs: listRuns() });
});

app.get("/runs/:runId", (req: Request, res: Response) => {
  const run = getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(run);
});

app.post("/run", async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Partial<AgentRunRequest>;
    const rr: AgentRunRequest = {
      goal: body.goal === "compute" ? "compute" : "get_signal",
      maxSpendUsd: Number(body.maxSpendUsd ?? 0.05),
      confidenceMin: Number(body.confidenceMin ?? 0.5),
      prompt: body.prompt
    };

    const out = await runOnce(rr);
    res.json(out);
  } catch (err) {
    log.error("run_failed", { err: String(err) });
    res.status(500).json({ error: "run_failed" });
  }
});

app.listen(PORT, () => {
  log.info("listening", { port: PORT, sellerBaseUrl: SELLER_BASE_URL });
});
