import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const baseUrl = process.env.SELLER_BASE_URL || "http://localhost:3001";
  const adminSecret = process.env.SELLER_ADMIN_SECRET || "dev-secret";
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${baseUrl}/admin/price-mode`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-secret": adminSecret },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
