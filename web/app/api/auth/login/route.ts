import { NextResponse } from "next/server";
import { API_URL } from "@/lib/config";
import { setSessionCookie } from "@/lib/auth-cookie";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return setSessionCookie(NextResponse.json({ user: data.user }), data.token);
}
