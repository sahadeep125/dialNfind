import "server-only";
import { NextResponse } from "next/server";

/**
 * Refuses requests sent from another site. The session cookie is SameSite=Lax, which already blocks most
 * cross-site POSTs; this also covers sibling subdomains and older browsers. Requests without Origin or
 * Sec-Fetch-Site (not from a browser) pass, since they cannot carry the visitor's cookie.
 */
export function crossSiteRejection(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return forbidden();
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* "null" or malformed */
    }
    if (!host || originHost !== host) return forbidden();
  }
  return null;
}

function forbidden() {
  return NextResponse.json({ error: { code: "forbidden", message: "This request must come from the DialNFind website." } }, { status: 403 });
}

/** Reads an API response body, or null when it is not JSON (a proxy error page, for example). */
export async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null);
}
