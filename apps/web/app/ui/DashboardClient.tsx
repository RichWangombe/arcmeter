"use client";

import { useEffect, useMemo, useState } from "react";

type SellerHealth = { ok: boolean; priceRaiseMode: boolean; envDefault: boolean };
type FacilitatorHealth = { ok: boolean };
type AgentHealth = { ok: boolean };

type ReceiptRow = {
  id: string;
  createdAt: string;
  requestId: string;
  payer: string;
  amountUsd: number;
  txHash: string;
  clientId?: string;
};

type RunListRow = {
  runId: string;
  createdAt: string;
  spentUsd: number;
};

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function DashboardClient() {
  const [sellerHealth, setSellerHealth] = useState<SellerHealth | null>(null);
  const [facilitatorHealth, setFacilitatorHealth] = useState<FacilitatorHealth | null>(null);
  const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [runs, setRuns] = useState<RunListRow[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runOutput, setRunOutput] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goal, setGoal] = useState<string>("get_signal");
  const [maxSpendUsd, setMaxSpendUsd] = useState<string>("0.05");
  const [confidenceMin, setConfidenceMin] = useState<string>("0.5");
  const [prompt, setPrompt] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const priceRaiseMode = sellerHealth?.priceRaiseMode ?? null;

  const healthText = useMemo(() => {
    const bits = [];
    bits.push(`seller=${sellerHealth?.ok ? "ok" : sellerHealth ? "down" : "…"}`);
    bits.push(`facilitator=${facilitatorHealth?.ok ? "ok" : facilitatorHealth ? "down" : "…"}`);
    bits.push(`agent=${agentHealth?.ok ? "ok" : agentHealth ? "down" : "…"}`);
    return bits.join(" | ");
  }, [sellerHealth, facilitatorHealth, agentHealth]);

  async function refreshHealth() {
    const [s, f, a] = await Promise.all([
      fetch("/api/seller/health"),
      fetch("/api/facilitator/health"),
      fetch("/api/agent/health")
    ]);
    setSellerHealth((await safeJson(s)) as SellerHealth);
    setFacilitatorHealth((await safeJson(f)) as FacilitatorHealth);
    setAgentHealth((await safeJson(a)) as AgentHealth);
  }

  async function refreshReceipts() {
    const res = await fetch("/api/seller/receipts");
    const json = (await safeJson(res)) as { receipts?: ReceiptRow[] };
    setReceipts(json.receipts || []);
  }

  async function refreshRuns() {
    const res = await fetch("/api/agent/runs");
    const json = (await safeJson(res)) as { runs?: RunListRow[] };
    setRuns(json.runs || []);
  }

  async function loadRun(runId: string) {
    const res = await fetch(`/api/agent/runs/${encodeURIComponent(runId)}`);
    setSelectedRun(await safeJson(res));
  }

  async function setPriceMode(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/price-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `http_${res.status}`);
      }
      await refreshHealth();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runAgent() {
    setBusy(true);
    setError(null);
    setRunOutput(null);
    try {
      const body = {
        goal,
        maxSpendUsd: Number(maxSpendUsd),
        confidenceMin: Number(confidenceMin),
        prompt: prompt || undefined
      };
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await safeJson(res);
      setRunOutput(json);
      await refreshRuns();
      await refreshReceipts();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshHealth().catch(() => undefined);
    refreshReceipts().catch(() => undefined);
    refreshRuns().catch(() => undefined);
  }, []);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>ArcMeter Dashboard</h1>
            <div className="small">{healthText}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a className="small" href="/about">
              About
            </a>
            <button disabled={busy} onClick={() => {
              refreshHealth().catch(() => undefined);
              refreshReceipts().catch(() => undefined);
              refreshRuns().catch(() => undefined);
            }}>
              Refresh
            </button>
          </div>
        </div>
        {error ? <div className="small" style={{ marginTop: 10, color: "#ffb4b4" }}>{error}</div> : null}
      </div>

      <div className="row">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Seller Controls</h2>
          <div className="small" style={{ marginBottom: 12 }}>
            Price raise mode is currently: <b>{priceRaiseMode === null ? "…" : priceRaiseMode ? "ENABLED" : "disabled"}</b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={busy} onClick={() => setPriceMode(false)}>
              Disable
            </button>
            <button disabled={busy} onClick={() => setPriceMode(true)}>
              Enable
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Run Agent Buyer</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            Calls agent-buyer `/run`, which triggers a real `/signal` paywall flow.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Goal</div>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="get_signal">get_signal</option>
                <option value="compute">compute</option>
              </select>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Max spend (USD)</div>
                <input value={maxSpendUsd} onChange={(e) => setMaxSpendUsd(e.target.value)} />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Confidence min</div>
                <input value={confidenceMin} onChange={(e) => setConfidenceMin(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Optional prompt</div>
              <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </div>
            <button disabled={busy} onClick={() => runAgent()}>
              {busy ? "Running…" : "Run"}
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Recent Runs</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            Select a run to view its event log and result.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {runs.length === 0 ? <div className="small">No runs yet.</div> : null}
            {runs.slice(0, 10).map((r) => (
              <button
                key={r.runId}
                disabled={busy}
                onClick={() => loadRun(r.runId)}
                style={{ textAlign: "left" }}
              >
                <div><b>{r.runId}</b></div>
                <div className="small">{r.createdAt} | spent ${r.spentUsd}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Run Output</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            Most recent `/run` response.
          </div>
          <pre style={{ maxHeight: 340 }}>{JSON.stringify(runOutput, null, 2)}</pre>
        </div>
      </div>

      <div className="row">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Selected Run Details</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            GET `/runs/:runId`
          </div>
          <pre style={{ maxHeight: 420 }}>{JSON.stringify(selectedRun, null, 2)}</pre>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Receipts Ledger</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            Seller receipts from `/admin/receipts`.
          </div>
          <pre style={{ maxHeight: 420 }}>{JSON.stringify(receipts.slice(0, 25), null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
