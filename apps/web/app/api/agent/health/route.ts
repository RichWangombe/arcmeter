import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.AGENT_BUYER_BASE_URL || "http://localhost:3003";
  const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
