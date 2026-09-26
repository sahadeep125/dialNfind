import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, TOKEN_COOKIE } from "@/lib/config";
import { forwardClientIp } from "@/lib/client-ip";
import { crossSiteRejection } from "@/lib/same-origin";

/** Same-origin proxy so client components can call the API with the httpOnly session token. Bodies pass through as bytes so file uploads survive. */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;
  const { path } = await params;
  const url = new URL(request.url);
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${url.search}`;
  const headers = new Headers({ accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);
  forwardClientIp(request.headers, headers);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const res = await fetch(target, { method: request.method, headers, body: hasBody ? await request.arrayBuffer() : undefined, cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
