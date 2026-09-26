import { NextResponse } from "next/server";
import { signInThroughApi } from "@/lib/auth-route";

/** POST /api/auth/social — { provider: "google" | "apple", ...token } → signs in through the API and sets the session cookie. */
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as ({ provider?: unknown } & Record<string, unknown>) | null;
  const provider = input?.provider;
  if (provider !== "google" && provider !== "apple") {
    return NextResponse.json({ error: { code: "bad_request", message: "Unknown sign-in method" } }, { status: 400 });
  }
  const { provider: _omit, ...payload } = input!;
  return signInThroughApi(request, `/auth/${provider}`, JSON.stringify({ ...payload, role: "customer" }), (data) => ({
    user: data.user,
    isNewUser: data.isNewUser,
  }));
}
