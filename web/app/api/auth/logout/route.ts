import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/config";
import { crossSiteRejection } from "@/lib/same-origin";

export async function POST(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;
  // End the session on the API as well, so the token cannot be reused after sign-out.
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
