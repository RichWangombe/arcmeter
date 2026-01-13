import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: { runId: string } }) {
  const baseUrl = process.env.AGENT_BUYER_BASE_URL || "http://localhost:3003";
  const runId = ctx.params.runId;
  const res = await fetch(`${baseUrl}/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
