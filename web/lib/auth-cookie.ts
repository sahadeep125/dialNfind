import type { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/config";

/** Keeps the API token in an httpOnly cookie, out of reach of page scripts. Lasts as long as an API session. */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
