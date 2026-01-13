import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const baseUrl = process.env.AGENT_BUYER_BASE_URL || "http://localhost:3003";
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
