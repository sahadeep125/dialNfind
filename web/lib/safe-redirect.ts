/**
 * Where to go after signing in. Only same-site paths are allowed: "//host" and "/\host" are treated by
 * browsers as other sites, so they fall back like any other outside URL. Browsers also drop tabs and
 * newlines from URLs, which would turn "/\t/host" into "//host", so any control character falls back too.
 */
export function safeRedirect(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || /[\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
