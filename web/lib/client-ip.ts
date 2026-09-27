import "server-only";

/**
 * The visitor's address as seen by the proxy in front of this app. The API limits requests per address, so
 * without it every visitor would share one limit. The rightmost X-Forwarded-For entry is the one our own
 * proxy added; entries to its left come from the visitor and can be anything.
 *
 * Headers such as X-Real-IP or CF-Connecting-IP are only trustworthy when the host always overwrites them,
 * so they are read only when CLIENT_IP_HEADER names one (for example `x-real-ip` behind nginx or
 * `cf-connecting-ip` behind Cloudflare). A visitor could otherwise send their own and dodge the limits.
 */
export function clientIp(headers: Headers): string | null {
  const trusted = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (trusted && trusted !== "x-forwarded-for") return headers.get(trusted)?.trim() || null;
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop();
  return last ?? null;
}

/** Passes the visitor's address on to the API, which trusts one proxy hop (server/src/app.ts). */
export function forwardClientIp(from: Headers, to: Headers) {
  const ip = clientIp(from);
  if (ip) to.set("x-forwarded-for", ip);
}
