import { NextResponse, type NextRequest } from "next/server";
import { serviceHref } from "@/lib/service-href";

/**
 * Subcategories used to live at /services/<category>?sub=<slug>; they now have their own path. Old links
 * (bookmarks, search results, shared URLs) get a permanent redirect that keeps every other query value.
 * A next.config redirect cannot do this, because it passes the whole query string, `sub` included, along.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const sub = url.searchParams.get("sub");
  // Only /services/<category>, never a deeper path.
  const [, , category, ...rest] = url.pathname.replace(/\/+$/, "").split("/");
  if (!sub || !category || rest.length) return NextResponse.next();
  url.searchParams.delete("sub");
  url.pathname = serviceHref(decodeURIComponent(category), sub);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [{ source: "/services/:category", has: [{ type: "query", key: "sub" }] }],
};
