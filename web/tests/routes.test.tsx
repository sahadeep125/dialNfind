import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidateTag, updateTag } from "next/cache";
import { request } from "./next-state";
import { json, mockApi, provider, user } from "./helpers";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as social } from "@/app/api/auth/social/route";
import { GET as session } from "@/app/api/session/route";
import { GET as proxyGet, POST as proxyPost } from "@/app/api/proxy/[...path]/route";
import { proxy, config as proxyConfig } from "@/proxy";
import { GET as aasa } from "@/app/.well-known/apple-app-site-association/route";
import { GET as assetlinks } from "@/app/.well-known/assetlinks.json/route";
import { GET as sitemapIndex } from "@/app/sitemap.xml/route";
import manifest from "@/app/manifest";
import OgImage from "@/app/opengraph-image";
import TwitterImage from "@/app/twitter-image";
import AppleIcon from "@/app/apple-icon";
import ProviderOg from "@/app/providers/[slug]/opengraph-image";
import ProviderTwitter from "@/app/providers/[slug]/twitter-image";
import GuideOg, { generateStaticParams as guideOgParams } from "@/app/guides/[slug]/opengraph-image";
import GuideTwitter, { generateStaticParams as guideTwitterParams } from "@/app/guides/[slug]/twitter-image";
import { refreshProvider } from "@/app/providers/[slug]/actions";
import { POST as revalidate } from "@/app/api/revalidate/route";
import sitemap, { generateSitemaps } from "@/app/sitemaps/sitemap";
import { GUIDES } from "@/lib/guides";

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { host: "localhost", origin: "http://localhost", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

describe("auth routes", () => {
  it("logs in and registers through the API", async () => {
    const fetch = mockApi({ "POST /auth/login": { token: "t1", user: { id: 1 } }, "POST /auth/register": { token: "t2", user: { id: 2 } } });
    const a = await login(post("/api/auth/login", { email: "a@b.co", password: "x" }));
    expect(await a.json()).toEqual({ user: { id: 1 } });
    expect(a.headers.get("set-cookie")).toContain("dnf_token=t1");
    const b = await register(post("/api/auth/register", { name: "A" }));
    expect(await b.json()).toEqual({ user: { id: 2 } });
    expect(fetch.mock.calls[0]![1]!.body).toBe(JSON.stringify({ email: "a@b.co", password: "x" }));
  });
  it("signs in with Google or Apple as a customer", async () => {
    const fetch = mockApi({ "POST /auth/google": { token: "t", user: { id: 1 }, isNewUser: true } });
    const res = await social(post("/api/auth/social", { provider: "google", idToken: "x", nonce: "n" }));
    expect(await res.json()).toEqual({ user: { id: 1 }, isNewUser: true });
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ idToken: "x", nonce: "n", role: "customer" });
    mockApi({ "POST /auth/apple": { token: "t", user: { id: 2 } } });
    expect((await social(post("/api/auth/social", { provider: "apple", idToken: "x" }))).status).toBe(200);
    expect((await social(post("/api/auth/social", { provider: "facebook" }))).status).toBe(400);
    expect((await social(post("/api/auth/social", "not json"))).status).toBe(400);
  });
  it("logs out on the API and clears the cookie, even when the API is down", async () => {
    request.cookies.set("dnf_token", "t");
    const fetch = mockApi({ "POST /auth/logout": { ok: true } });
    const res = await logout(post("/api/auth/logout", {}));
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toContain("dnf_token=;");
    expect((fetch.mock.calls[0]![1]!.headers as Headers).get("authorization")).toBe("Bearer t");
    mockApi({ "POST /auth/logout": () => Promise.reject(new Error("down")) as never });
    expect((await logout(post("/api/auth/logout", {}))).status).toBe(200);
    expect((await logout(post("/api/auth/logout", {}, { origin: "https://evil.example" }))).status).toBe(403);
  });
  it("reports the session with the unread count", async () => {
    expect(await (await session()).json()).toEqual({ user: null, unread: 0 });
    request.cookies.set("dnf_token", "t");
    mockApi({ "/auth/me": { user: user() }, "/me/notifications": { unread: 3 } });
    const res = await session();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toMatchObject({ user: { id: 7 }, unread: 3 });
    mockApi({ "/auth/me": { user: user() }, "/me/notifications": json({}, 500) });
    expect((await (await session()).json()).unread).toBe(0);
    mockApi({ "/auth/me": { user: user() }, "/me/notifications": {} });
    expect((await (await session()).json()).unread).toBe(0);
  });
});

describe("API proxy", () => {
  const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });

  it("forwards the request with the session token and passes headers back", async () => {
    request.cookies.set("dnf_token", "t");
    const fetch = mockApi({
      "POST /uploads": new Response('{"url":"u"}', { status: 201, headers: { "content-type": "application/json", "retry-after": "5", "x-internal": "no" } }),
    });
    const res = await proxyPost(new Request("http://localhost/api/proxy/uploads?purpose=avatar", { method: "POST", headers: { host: "localhost", "content-type": "image/png", "x-forwarded-for": "1.1.1.1" }, body: new Uint8Array([1, 2]) }), ctx("uploads"));
    expect(res.status).toBe(201);
    expect(res.headers.get("retry-after")).toBe("5");
    expect(res.headers.get("x-internal")).toBeNull();
    expect(await res.json()).toEqual({ url: "u" });
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("http://api.test/api/v1/uploads?purpose=avatar");
    const headers = init!.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer t");
    expect(headers.get("content-type")).toBe("image/png");
    expect(headers.get("x-forwarded-for")).toBe("1.1.1.1");
    expect(new Uint8Array(init!.body as ArrayBuffer)).toEqual(new Uint8Array([1, 2]));
  });
  it("defaults the content type, refuses bad paths and reports an unreachable API", async () => {
    const fetch = mockApi({ "GET /me/overview": new Response(new Uint8Array([123, 125]), { status: 200 }) });
    const res = await proxyGet(new Request("http://localhost/api/proxy/me/overview"), ctx("me", "overview"));
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(fetch.mock.calls[0]![1]!.body).toBeUndefined();
    expect((fetch.mock.calls[0]![1]!.headers as Headers).get("authorization")).toBeNull();
    expect((await proxyGet(new Request("http://localhost/api/proxy/.."), ctx(".."))).status).toBe(404);
    mockApi({ "GET /x": () => Promise.reject(new Error("down")) as never });
    const down = await proxyGet(new Request("http://localhost/api/proxy/x"), ctx("x"));
    expect(down.status).toBe(502);
    expect((await proxyPost(post("/api/proxy/x", {}, { origin: "https://evil.example" }), ctx("x"))).status).toBe(403);
  });
});

describe("old subcategory links", () => {
  const run = (url: string) => proxy(new NextRequest(url));
  it("redirects /services/<category>?sub= to the subcategory path", () => {
    const res = run("http://localhost/services/electronics-repair?sub=tv-repair&page=2");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/services/electronics-repair/tv-repair?page=2");
    // A trailing slash is kept here; the site-wide trailing-slash redirect (next.config.ts) removes it.
    expect(run("http://localhost/services/electronics-repair/?sub=tv").headers.get("location")).toMatch(/^http:\/\/localhost\/services\/electronics-repair\/tv\/?$/);
  });
  it("leaves other addresses alone", () => {
    expect(run("http://localhost/services/electronics-repair").headers.get("x-middleware-next")).toBe("1");
    expect(run("http://localhost/services?sub=x").headers.get("x-middleware-next")).toBe("1");
    expect(run("http://localhost/services/a/b?sub=x").headers.get("x-middleware-next")).toBe("1");
    expect(proxyConfig.matcher[0]!.source).toBe("/services/:category");
  });
});

describe("well-known and metadata routes", () => {
  it("serves app link files", async () => {
    const apple = await aasa().json();
    expect(apple.applinks.details[0].appIDs[0]).toMatch(/com\.dialnfind\.app$/);
    expect(await assetlinks().json()).toEqual([]);
    vi.resetModules();
    vi.stubEnv("ANDROID_SHA256_CERT_FINGERPRINTS", "AA:BB");
    const fresh = await import("@/app/.well-known/assetlinks.json/route");
    expect((await fresh.GET().json())[0].target.sha256_cert_fingerprints).toEqual(["AA:BB"]);
  });
  it("lists the sitemap files and builds them", async () => {
    mockApi({ "/providers/sitemap": { results: [{ slug: "a", updatedAt: "2026-01-01T00:00:00Z" }], total: 100000, totalPages: 3 }, "/categories": { categories: [{ slug: "c", subcategories: [{ slug: "s" }] }] } });
    const xml = await (await sitemapIndex()).text();
    expect(xml).toContain("<loc>https://dialnfind.com/sitemaps/sitemap/3.xml</loc>");
    expect(await generateSitemaps()).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
    expect((await sitemap({ id: Promise.resolve("0") })).length).toBeGreaterThan(9);
    expect(await sitemap({ id: Promise.resolve("1") })).toEqual([expect.objectContaining({ url: "https://dialnfind.com/providers/a" })]);
    expect(manifest().short_name).toBe("DialNFind");
  });
  it("draws the social images", async () => {
    expect((OgImage() as unknown as { markup: string }).markup).toContain("Find trusted local pros");
    expect((TwitterImage() as unknown as { markup: string }).markup).toContain("Find trusted local pros");
    expect((AppleIcon() as unknown as { markup: string }).markup).toContain("<svg");
    const guide = GUIDES[0]!;
    expect(guideOgParams()).toContainEqual({ slug: guide.slug });
    expect(guideTwitterParams()).toHaveLength(GUIDES.length);
    expect(((await GuideOg({ params: Promise.resolve({ slug: guide.slug }) })) as unknown as { markup: string }).markup).toContain(guide.title.slice(0, 20));
    expect(((await GuideTwitter({ params: Promise.resolve({ slug: "nope" }) })) as unknown as { markup: string }).markup).toContain("Home service guides");
    expect(((await GuideOg({ params: Promise.resolve({ slug: "nope" }) })) as unknown as { markup: string }).markup).toContain("Home service guides");
    expect(((await GuideTwitter({ params: Promise.resolve({ slug: guide.slug }) })) as unknown as { markup: string }).markup).toContain("DialNFind guide");
  });
  it.each([["opengraph", ProviderOg], ["twitter", ProviderTwitter]] as const)("draws the %s image for a provider", async (_name, Image) => {
    const draw = async (p: Record<string, unknown> | null) => {
      mockApi({ "/providers/s": p ? { provider: provider(p) } : json({}, 404) });
      return ((await Image({ params: Promise.resolve({ slug: "s" }) })) as unknown as { markup: string }).markup;
    };
    expect(await draw(null)).toContain("Trusted local service providers");
    const full = await draw({});
    expect(full).toContain("Andheri, Mumbai · Rated 4.5 from 12 reviews");
    expect(full).toContain("Verified provider");
    const bare = await draw({ locality: null, totalReviews: 0, primaryCategory: null, verificationStatus: "none" });
    expect(bare).toContain("Mumbai · New on DialNFind");
    expect(bare).toContain("Local services");
    expect(bare).not.toContain("Verified provider");
  });
});

describe("refreshProvider action", () => {
  it("refreshes a cached profile for signed-in visitors only", async () => {
    await refreshProvider("Bad Slug!");
    await refreshProvider("sharma-tv");
    expect(updateTag).not.toHaveBeenCalled();
    request.cookies.set("dnf_token", "t");
    mockApi({ "/auth/me": { user: user() } });
    await refreshProvider("sharma-tv");
    expect(updateTag).toHaveBeenCalledWith("provider:sharma-tv");
  });
});

describe("revalidate route", () => {
  const call = (body: unknown, secret?: string) => revalidate(post("/api/revalidate", body, secret === undefined ? {} : { "x-revalidate-secret": secret }));

  it("refuses callers without the shared secret", async () => {
    expect((await call({ tags: ["categories"] }, "anything")).status).toBe(401);
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    expect((await call({ tags: ["categories"] })).status).toBe(401);
    expect((await call({ tags: ["categories"] }, "wrong!")).status).toBe(401);
    expect((await call({ tags: ["categories"] }, "s3cre")).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it("expires each valid tag at once and rejects malformed lists", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    const res = await call({ tags: ["provider:sharma-tv-mumbai", "providers", "providers"] }, "s3cret");
    expect(await res.json()).toEqual({ ok: true, revalidated: 3 });
    expect(revalidateTag).toHaveBeenCalledWith("provider:sharma-tv-mumbai", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    for (const body of [{}, { tags: [] }, { tags: ["Bad Tag"] }, { tags: [1] }, { tags: Array.from({ length: 51 }, (_, i) => `t${i}`) }, "not json"]) {
      expect((await call(body, "s3cret")).status).toBe(400);
    }
    vi.unstubAllEnvs();
  });
});
