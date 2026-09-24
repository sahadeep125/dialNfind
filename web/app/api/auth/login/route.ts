import { NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/config";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  const response = NextResponse.json({ user: data.user });
  response.cookies.set(TOKEN_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
