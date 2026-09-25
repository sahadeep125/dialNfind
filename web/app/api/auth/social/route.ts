import { NextResponse } from "next/server";
import { API_URL } from "@/lib/config";
import { setSessionCookie } from "@/lib/auth-cookie";

/** POST /api/auth/social — { provider: "google" | "apple", ...token } → signs in through the API and sets the session cookie. */
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as ({ provider?: unknown } & Record<string, unknown>) | null;
  const provider = input?.provider;
  if (provider !== "google" && provider !== "apple") {
    return NextResponse.json({ error: { code: "bad_request", message: "Unknown sign-in method" } }, { status: 400 });
  }
  const { provider: _omit, ...payload } = input!;
  const res = await fetch(`${API_URL}/auth/${provider}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, role: "customer" }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return NextResponse.json(data ?? { error: { message: "Could not sign in" } }, { status: res.status });
  return setSessionCookie(NextResponse.json({ user: data.user, isNewUser: data.isNewUser }), data.token);
}
