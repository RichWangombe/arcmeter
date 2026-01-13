import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.FACILITATOR_BASE_URL || "http://localhost:3002";
  const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
