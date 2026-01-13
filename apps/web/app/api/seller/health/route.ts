import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.SELLER_BASE_URL || "http://localhost:3001";
  const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
