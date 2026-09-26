import "server-only";

/**
 * The visitor's address as seen by the proxy in front of this app (the platform or nginx sets these
 * headers). The API limits requests per address, so without it every visitor would share one limit.
 * The rightmost X-Forwarded-For entry is the one our own proxy added; entries to its left come from the visitor.
 */
export function clientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop();
  return last ?? null;
}

/** Passes the visitor's address on to the API, which trusts one proxy hop (server/src/app.ts). */
export function forwardClientIp(from: Headers, to: Headers) {
  const ip = clientIp(from);
  if (ip) to.set("x-forwarded-for", ip);
}
