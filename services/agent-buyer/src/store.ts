import crypto from "node:crypto";
import type { AgentLogEvent } from "@arcmeter/shared";

export type RunRecord = {
  runId: string;
  createdAt: string;
  spentUsd: number;
  result?: unknown;
  receipt?: {
    requestId: string;
    txHash: string;
    payer: string;
    amountUsd: number;
    currency: "USDC";
    verifiedAt: string;
    rawProofJson: unknown;
  };
  log: AgentLogEvent[];
};

const runs = new Map<string, RunRecord>();

export function newRun(): RunRecord {
  const runId = crypto.randomUUID();
  const rec: RunRecord = {
    runId,
    createdAt: new Date().toISOString(),
    spentUsd: 0,
    log: []
  };
  runs.set(runId, rec);
  return rec;
}

export function appendEvent(runId: string, ev: Omit<AgentLogEvent, "id" | "runId">): AgentLogEvent {
  const run = runs.get(runId);
  if (!run) throw new Error("run_not_found");

  const full: AgentLogEvent = {
    id: crypto.randomUUID(),
    runId,
    ts: ev.ts,
    type: ev.type,
    data: ev.data
  };
  run.log.push(full);
  return full;
}

export function setRunResult(runId: string, patch: Partial<RunRecord>): RunRecord {
  const run = runs.get(runId);
  if (!run) throw new Error("run_not_found");
  Object.assign(run, patch);
  return run;
}

export function getRun(runId: string): RunRecord | undefined {
  return runs.get(runId);
}

export function listRuns(): RunRecord[] {
  return [...runs.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
