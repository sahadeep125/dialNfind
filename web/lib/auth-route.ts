import "server-only";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/config";
import { setSessionCookie } from "@/lib/auth-cookie";
import { forwardClientIp } from "@/lib/client-ip";
import { crossSiteRejection, readJson } from "@/lib/same-origin";

/** Signs in or up through the API and keeps the returned token in the session cookie. */
export async function signInThroughApi(request: Request, apiPath: string, body: string, pick: (data: any) => Record<string, unknown>) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;
  const headers = new Headers({ "content-type": "application/json" });
  forwardClientIp(request.headers, headers);
  const res = await fetch(`${API_URL}${apiPath}`, { method: "POST", headers, body });
  const data = await readJson(res);
  if (!res.ok || !data?.token) {
    const status = res.ok ? 502 : res.status;
    return NextResponse.json(data ?? { error: { code: "bad_gateway", message: "Could not reach DialNFind. Please try again." } }, { status });
  }
  return setSessionCookie(NextResponse.json(pick(data)), data.token);
}
