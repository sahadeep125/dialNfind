import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/config";
import { forwardClientIp } from "@/lib/client-ip";
import { proxyPath } from "@/lib/proxy-path";
import { crossSiteRejection } from "@/lib/same-origin";

/** Response headers the browser needs besides the body: rate-limit waits and file download names. */
const PASSED_HEADERS = ["content-type", "content-disposition", "retry-after"];
const TIMEOUT_MS = 30_000;

/** Same-origin proxy so client components can call the API with the httpOnly session token. Bodies pass through as bytes so file uploads survive. */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;
  const path = proxyPath((await params).path);
  if (!path) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const url = new URL(request.url);
  const target = `${API_URL}/${path}${url.search}`;
  const headers = new Headers({ accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);
  forwardClientIp(request.headers, headers);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let res: Response;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ error: { code: "unavailable", message: "We could not reach DialNFind. Check your connection and try again." } }, { status: 502 });
  }
  const out = new Headers();
  for (const name of PASSED_HEADERS) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  if (!out.has("content-type")) out.set("content-type", "application/json");
  return new NextResponse(await res.arrayBuffer(), { status: res.status, headers: out });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
