/**
 * Website links (https://dialnfind.com/...) open the app through universal links / app links. The
 * website and the app name some screens differently, so this turns a website path into an app path.
 * Anything it does not recognise is passed through unchanged.
 */
export function mapWebPath(input: string): string {
  // Drop scheme and host: "https://dialnfind.com/x", "dialnfind:///x" and "/x" all become "/x".
  const withoutOrigin = input.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
  const [pathPart = "", query = ""] = withoutOrigin.split("?");
  const path = `/${pathPart.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const params = new URLSearchParams(query);
  const withQuery = (p: string, keep: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `${p}?${s}` : p;
  };

  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/providers\/([^/]+)$/))) return `/provider/${m[1]}`;
  if (path === "/services") return "/categories";
  if ((m = path.match(/^\/services\/([^/]+)$/))) return withQuery(`/category/${m[1]}`, { sub: params.get("sub") });
  if (path === "/search")
    return withQuery("/search", { q: params.get("q"), category: params.get("category"), sub: params.get("sub") });
  if (path === "/dashboard/notifications") return "/notifications";
  if (path === "/dashboard/contacts") return "/contacts";
  if (path === "/dashboard/favorites") return "/favorites";
  if (path === "/dashboard/reviews") return "/reviews";
  if (path === "/dashboard/support") return "/support";
  if ((m = path.match(/^\/dashboard\/support\/(\d+)$/))) return `/support/${m[1]}`;
  if (path === "/dashboard" || path === "/dashboard/account") return "/settings";
  return withoutOrigin || "/";
}
