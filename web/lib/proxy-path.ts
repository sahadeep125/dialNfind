/**
 * The API path for a /api/proxy/* request. Dot segments and empty segments are refused: encodeURIComponent
 * leaves "." and ".." alone, so "/api/proxy/%2e%2e/uploads" would otherwise resolve outside /api/v1 while
 * still carrying the visitor's session token.
 */
export function proxyPath(segments: string[]): string | null {
  if (!segments.length || segments.some((s) => s === "" || s === "." || s === "..")) return null;
  return segments.map(encodeURIComponent).join("/");
}
