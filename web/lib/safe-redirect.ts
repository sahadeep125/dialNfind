/**
 * Where to go after signing in. Only same-site paths are allowed: "//host" and "/\host" are treated by
 * browsers as other sites, so they fall back like any other outside URL.
 */
export function safeRedirect(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
