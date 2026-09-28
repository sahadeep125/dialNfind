import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, apiOrNull, ApiError, publicApi, publicApiOrNull, toQuery } from "@/lib/api";
import { getSavedLocation, getSession, requireSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { DEFAULT_LOCATION } from "@/lib/default-location";
import { request, RedirectError } from "./next-state";
import { json, mockApi, user } from "./helpers";
import { sitemapCategories, sitemapIds } from "@/lib/sitemap-data";
import { clip, NO_INDEX, pageMetadata, SEO_CITY } from "@/lib/seo";
import { categoryImage, TOOLS_IMAGE } from "@/lib/stock-images";
import { getGuide, guidesForSubcategory, readingMinutes, GUIDES } from "@/lib/guides";
import { OgFrame, OG_SIZE } from "@/lib/og";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { absoluteUrl, articleJsonLd, itemListJsonLd, organizationJsonLd, providerJsonLd, websiteJsonLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { formatDate, formatDistance, formatPhone, formatPrice, formatRelative, telHref, whatsappHref } from "@/lib/format";
import { email, normalizePhone, optionalEmail, optionalInt, optionalPhone, optionalPincode, optionalUrl, orNull, password, personName, phone, pincode } from "@/lib/validation";
import { setSessionCookie } from "@/lib/auth-cookie";
import { signInThroughApi } from "@/lib/auth-route";
import { readJson } from "@/lib/same-origin";
import { NextResponse } from "next/server";

describe("api", () => {
  it("builds query strings", () => {
    expect(toQuery({ a: 1, b: "", c: null, d: undefined, e: false })).toBe("?a=1&e=false");
    expect(toQuery({})).toBe("");
  });
  it("forwards the session token, client IP and JSON body", async () => {
    request.cookies.set("dnf_token", "tok");
    request.headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    const fetch = mockApi({ "POST /things": { ok: true } });
    expect(await api("/things", { method: "POST", body: "{}", query: { page: 2 } })).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("http://api.test/api/v1/things?page=2");
    const headers = init!.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-forwarded-for")).toBe("1.2.3.4");
  });
  it("can skip auth and keeps an explicit content type", async () => {
    request.cookies.set("dnf_token", "tok");
    const fetch = mockApi({ "/x": { ok: 1 } });
    await api("/x", { auth: false, body: "a", headers: { "content-type": "text/plain" } });
    const headers = fetch.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("content-type")).toBe("text/plain");
    request.cookies.clear();
    await api("/x");
    expect((fetch.mock.calls[1]![1]!.headers as Headers).get("authorization")).toBeNull();
  });
  it("turns error bodies into ApiError", async () => {
    mockApi({ "/a": json({ error: { message: "Nope" } }, 400), "/b": new Response("oops", { status: 502, statusText: "Bad Gateway" }), "/c": json({}, 500) });
    await expect(api("/a")).rejects.toMatchObject({ status: 400, message: "Nope" });
    await expect(api("/b")).rejects.toMatchObject({ status: 502, message: "Bad Gateway" });
    await expect(api("/c")).rejects.toMatchObject({ status: 500 });
  });
  it("maps 404 and 401 to null in apiOrNull, and rethrows the rest", async () => {
    mockApi({ "/404": json({}, 404), "/401": json({}, 401), "/500": json({}, 500), "/ok": { v: 1 } });
    expect(await apiOrNull("/404")).toBeNull();
    expect(await apiOrNull("/401")).toBeNull();
    expect(await apiOrNull("/ok")).toEqual({ v: 1 });
    await expect(apiOrNull("/500")).rejects.toBeInstanceOf(ApiError);
    const fetch = mockApi({ "/throws": () => Promise.reject(new TypeError("network")) as never });
    await expect(apiOrNull("/throws")).rejects.toThrow("network");
    expect(fetch).toHaveBeenCalled();
  });
  it("publicApi caches with tags and maps 404 to null", async () => {
    const fetch = mockApi({ "/p": { v: 1 }, "/missing": json({ error: { message: "Gone" } }, 404), "/down": new Response("x", { status: 503, statusText: "Down" }) });
    expect(await publicApi("/p", { query: { a: 1 }, tags: ["t"] })).toEqual({ v: 1 });
    expect(fetch.mock.calls[0]![1]).toMatchObject({ next: { revalidate: 300, tags: ["t"] } });
    expect(await publicApiOrNull("/missing")).toBeNull();
    await expect(publicApi("/missing")).rejects.toMatchObject({ message: "Gone" });
    // Only 404 means "no data"; other failures throw, so an outage is never cached as "not found".
    await expect(publicApiOrNull("/down")).rejects.toMatchObject({ status: 503 });
    await expect(publicApi("/down")).rejects.toMatchObject({ status: 503, message: "Down" });
    expect(await publicApiOrNull("/p")).toEqual({ v: 1 });
    await publicApi("/p");
  });
});

describe("publicApi when the API cannot be reached", () => {
  it("throws at runtime, so the empty page is not cached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(publicApi("/categories")).rejects.toThrow("fetch failed");
    await expect(publicApiOrNull("/providers/x")).rejects.toThrow("fetch failed");
  });
});

describe("publicApi when the API cannot be reached (builds without an API)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PHASE", "phase-production-build"));
  afterEach(() => vi.unstubAllEnvs());
  it("returns empty data shaped for each endpoint", async () => {
    mockApi({});
    expect(await publicApi("/stats")).toEqual({ providers: 0, categories: 0, cities: 0, reviews: 0 });
    expect(await publicApi("/providers/sitemap")).toMatchObject({ totalPages: 0 });
    expect(await publicApi("/reviews/highlights")).toMatchObject({ reviews: [] });
    expect(await publicApi("/categories")).toEqual({ categories: [] });
    expect(await publicApi("/search/popular")).toEqual({ terms: [] });
    expect(await publicApi("/plans")).toEqual({ plans: [] });
    expect(await publicApi("/app-config")).toEqual({ config: { min_review_length: 10 } });
    expect(await publicApi("/providers/x/similar")).toEqual({ results: [] });
    expect(await publicApiOrNull("/categories")).toEqual({ categories: [] });
    expect(console.warn).toBeDefined();
  });
  it("answers anything else with a harmless empty object", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));
    const data = (await publicApi<Record<string | symbol, unknown>>("/providers/x")) as Record<string | symbol, unknown>;
    expect(data.results).toEqual([]);
    expect(data.config).toEqual({ min_review_length: 10 });
    expect(data.totalPages).toBe(0);
    expect(data.somethingElse).toBeUndefined();
    expect(data.then).toBeUndefined();
    expect(data[Symbol.iterator]).toBeUndefined();
  });
});

describe("session", () => {
  it("is empty without a token", async () => {
    expect(await getSession()).toBeNull();
  });
  it("loads the user, and treats 401 as signed out and other errors as unreachable", async () => {
    request.cookies.set("dnf_token", "t");
    mockApi({ "/auth/me": { user: user() } });
    expect(await getSession()).toMatchObject({ id: 7 });
    mockApi({ "/auth/me": json({}, 401) });
    expect(await getSession()).toBeNull();
    await expect(requireSession("/dashboard?x=1")).rejects.toEqual(new RedirectError("/login?next=%2Fdashboard%3Fx%3D1"));
    mockApi({ "/auth/me": json({}, 500) });
    expect(await getSession()).toBeNull();
    await expect(requireSession("/d")).rejects.toThrow("could not reach DialNFind");
  });
  it("requires a confirmed email for signed-in pages", async () => {
    request.cookies.set("dnf_token", "t");
    mockApi({ "/auth/me": { user: user({ emailVerifiedAt: null }) } });
    await expect(requireSession("/dashboard")).rejects.toEqual(new RedirectError("/verify-email?next=%2Fdashboard"));
    mockApi({ "/auth/me": { user: user() } });
    expect(await requireSession("/dashboard")).toMatchObject({ id: 7 });
  });
  it("reads the saved location cookie", async () => {
    expect(await getSavedLocation()).toBe(DEFAULT_LOCATION);
    request.cookies.set("dnf_location", JSON.stringify({ ...DEFAULT_LOCATION, label: "Here" }));
    expect((await getSavedLocation()).label).toBe("Here");
    request.cookies.set("dnf_location", JSON.stringify({ label: "No coords" }));
    expect(await getSavedLocation()).toBe(DEFAULT_LOCATION);
    request.cookies.set("dnf_location", "{bad");
    expect(await getSavedLocation()).toBe(DEFAULT_LOCATION);
  });
  it("resolves the location from the URL first", async () => {
    expect(await resolveLocation({ lat: "19.1", lng: ["72.8"], loc: "Andheri, Mumbai" })).toMatchObject({ name: "Andheri", latitude: 19.1, longitude: 72.8 });
    expect((await resolveLocation({ lat: "19.1", lng: "72.8" })).label).toBe("Selected location");
    expect(await resolveLocation({ lat: "x", lng: "1" })).toBe(DEFAULT_LOCATION);
    expect(await resolveLocation({})).toBe(DEFAULT_LOCATION);
  });
});

describe("app config", () => {
  it("merges the API settings over the fallback, and survives an outage", async () => {
    vi.resetModules();
    mockApi({ "/app-config": { config: { support_email: "help@x.co" } } });
    const a = await import("@/lib/app-config");
    expect(await a.getAppConfig()).toMatchObject({ site_name: "DialNFind", support_email: "help@x.co", min_review_length: 10 });
    vi.resetModules();
    mockApi({ "/app-config": json({}, 500) });
    const b = await import("@/lib/app-config");
    expect((await b.getAppConfig()).support_email).toBeNull();
  });
});

describe("sitemap data", () => {
  it("counts provider files and survives an outage", async () => {
    mockApi({ "/providers/sitemap": { results: [], total: 0, totalPages: 1 }, "/categories": { categories: [] } });
    expect(await sitemapIds()).toEqual([0, 1]);
    expect(await sitemapCategories()).toEqual({ categories: [] });
    mockApi({ "/providers/sitemap": json({}, 500) });
    expect(await sitemapIds()).toEqual([0, 1]);
  });
});

describe("small helpers", () => {
  it("seo, images and guides", () => {
    expect(pageMetadata({ title: "T", description: "D", path: "/p" })).toMatchObject({ alternates: { canonical: "/p" }, openGraph: { type: "website" } });
    const withImages = pageMetadata({ title: "T", description: "D", path: "/p", images: [{ url: "/i.png" }], type: "article" });
    expect(withImages.twitter).toMatchObject({ images: ["/i.png"] });
    expect(NO_INDEX).toEqual({ index: false, follow: false });
    expect(SEO_CITY).toBe("Siliguri");
    expect(clip("a b c", 3)).toBe("a…");
    expect(categoryImage("plumbing").src).toContain("plumber");
    expect(categoryImage("unknown")).toBe(TOOLS_IMAGE);
    expect(categoryImage(null)).toBe(TOOLS_IMAGE);
    expect(getGuide(GUIDES[0]!.slug)).toBe(GUIDES[0]);
    expect(getGuide("nope")).toBeUndefined();
    expect(guidesForSubcategory("nope", "x")).toEqual([]);
    expect(readingMinutes({ ...GUIDES[0]!, summary: "x", sections: [], faqs: [] })).toBe(1);
    const withList = { ...GUIDES[0]!, sections: [{ heading: "h", paragraphs: ["p"], list: ["a", "b"] }] };
    expect(readingMinutes(withList)).toBeGreaterThanOrEqual(1);
    expect(cn("a", false && "b", "p-2", "p-4")).toBe("a p-4");
  });
  it("og frame", () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
    const short = renderToStaticMarkup(createElement(OgFrame, { eyebrow: "E", title: "Short", subtitle: "Sub", footer: "Foot" }));
    expect(short).toContain("Sub");
    expect(short).toContain("Foot");
    expect(short).toContain("font-size:76px");
    const long = renderToStaticMarkup(createElement(OgFrame, { eyebrow: "E", title: "x".repeat(50) }));
    expect(long).toContain("font-size:64px");
    expect(long).toContain("Find trusted local pros");
  });
  it("structured data", () => {
    expect(absoluteUrl("https://x.co/a")).toBe("https://x.co/a");
    expect(absoluteUrl("a")).toBe("https://dialnfind.com/a");
    expect(organizationJsonLd({ email: null, phone: "+91" }).contactPoint).toEqual([expect.objectContaining({ telephone: "+91" })]);
    expect(websiteJsonLd()["@type"]).toBe("WebSite");
    expect(itemListJsonLd([{ name: "A", path: "/a" }]).itemListElement).toEqual([{ "@type": "ListItem", position: 1, url: "https://dialnfind.com/a", name: "A" }]);
    expect(articleJsonLd({ title: "T", description: "D", path: "/g", datePublished: "2026", dateModified: "2026", keywords: ["a", "b"] })).toMatchObject({ keywords: "a, b" });
    const base = {
      slug: "s", businessName: "B", description: null, shortDescription: "", phone: "1", email: null, coverUrl: null, logoUrl: null, portfolio: [],
      addressLine: null, locality: null, city: "C", state: "S", pincode: null, latitude: 1, longitude: 2, serviceAreas: [], serviceRadiusKm: 5,
      website: null, services: [{ startingPrice: 100 }, { startingPrice: 0 }], is24x7: false, hours: [{ dayOfWeek: 1, openTime: null, closeTime: null }],
      totalReviews: 0, avgRating: 0, primaryCategory: null,
    };
    const ld = providerJsonLd(base as never, [{ author: { name: "A" }, createdAt: "2026-01-02T00:00:00Z", rating: 5, reviewText: null }] as never);
    expect(ld).toMatchObject({ "@type": "LocalBusiness", priceRange: "₹100", address: { addressLocality: "C" }, areaServed: { "@type": "GeoCircle" } });
    expect(ld).not.toHaveProperty("description");
    expect(ld).not.toHaveProperty("openingHoursSpecification");
    expect((ld.review as { reviewBody?: string }[])[0]).not.toHaveProperty("reviewBody");
    expect(providerJsonLd({ ...base, services: [] } as never, [])).not.toHaveProperty("priceRange");
  });
  it("format edge cases", () => {
    expect(formatPhone("+91 98765 43210")).toBe("+91 98765 43210");
    expect(formatPhone("9876543210")).toBe("98765 43210");
    expect(formatPhone("123")).toBe("123");
    expect(telHref("+91 98765-43210")).toBe("tel:+919876543210");
    expect(whatsappHref("+91 98765", "hi there")).toBe("https://wa.me/9198765?text=hi%20there");
    expect(whatsappHref("98")).toBe("https://wa.me/98");
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(0.01)).toBe("100 m away");
    expect(formatDistance(0.43)).toBe("450 m away");
    expect(formatDistance(3.456)).toBe("3.5 km away");
    expect(formatDistance(12.6)).toBe("13 km away");
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(500, "weird")).toBe("₹500");
    expect(formatPrice(500, "per_hour")).toBe("₹500 per hour");
    const ago = (ms: number) => formatRelative(new Date(Date.now() - ms).toISOString());
    const DAY = 864e5;
    expect(ago(1000)).toBe("Just now");
    expect(ago(5 * 3.6e6)).toBe("5h ago");
    expect(ago(1.5 * DAY)).toBe("Yesterday");
    expect(ago(5 * DAY)).toBe("5 days ago");
    expect(ago(40 * DAY)).toBe("1 month ago");
    expect(ago(100 * DAY)).toBe("3 months ago");
    expect(ago(400 * DAY)).toBe("1 year ago");
    expect(ago(1000 * DAY)).toBe("2 years ago");
    expect(formatDate("2026-01-05T00:00:00Z")).toBe("5 Jan 2026");
  });
  it("validation rules", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("098765 43210")).toBe("+919876543210");
    expect(normalizePhone("0123456789")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(phone.safeParse("9876543210").success).toBe(true);
    expect(phone.safeParse("").success).toBe(false);
    expect(optionalPhone.safeParse("").success).toBe(true);
    expect(optionalPhone.safeParse("12").success).toBe(false);
    expect(personName.safeParse("R2").success).toBe(false);
    expect(email.safeParse("x@y.co").success).toBe(true);
    expect(optionalEmail.safeParse("").success).toBe(true);
    expect(optionalEmail.safeParse("bad").success).toBe(false);
    expect(password.safeParse("abcdefg1").success).toBe(true);
    expect(pincode.safeParse("400001").success).toBe(true);
    expect(optionalPincode.safeParse("").success).toBe(true);
    expect(optionalPincode.safeParse("1").success).toBe(false);
    expect(optionalUrl.safeParse("").success).toBe(true);
    expect(optionalUrl.safeParse("https://x.co").success).toBe(true);
    expect(optionalUrl.safeParse("x.co").success).toBe(false);
    const years = optionalInt(0, 1000, "Years");
    expect(years.safeParse("").success).toBe(true);
    expect(years.safeParse("5").success).toBe(true);
    expect(years.safeParse("1001").error?.issues[0]!.message).toBe("Years must be a whole number from 0 to 1,000");
    expect(years.safeParse("x").success).toBe(false);
    expect(orNull("  ")).toBeNull();
    expect(orNull(" a ")).toBe("a");
  });
});

describe("auth route helpers", () => {
  it("sets a secure cookie only in production", () => {
    const res = setSessionCookie(NextResponse.json({}), "tok");
    expect(res.cookies.get("dnf_token")).toMatchObject({ value: "tok", httpOnly: true, secure: false, maxAge: 2592000 });
    vi.stubEnv("NODE_ENV", "production");
    expect(setSessionCookie(NextResponse.json({}), "tok").cookies.get("dnf_token")!.secure).toBe(true);
  });
  it("signs in through the API and keeps the token", async () => {
    const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/auth/login", { method: "POST", headers: { host: "localhost", origin: "http://localhost", "x-forwarded-for": "9.9.9.9", ...headers } });
    const fetch = mockApi({ "POST /auth/login": { token: "tok", user: { id: 1 } } });
    const ok = await signInThroughApi(req(), "/auth/login", "{}", (d) => ({ user: d.user }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ user: { id: 1 } });
    expect(ok.cookies.get("dnf_token")!.value).toBe("tok");
    expect((fetch.mock.calls[0]![1]!.headers as Headers).get("x-forwarded-for")).toBe("9.9.9.9");

    mockApi({ "POST /auth/login": json({ error: { message: "Bad" } }, 401) });
    const bad = await signInThroughApi(req(), "/auth/login", "{}", () => ({}));
    expect(bad.status).toBe(401);
    mockApi({ "POST /auth/login": json({ user: {} }) });
    expect((await signInThroughApi(req(), "/auth/login", "{}", () => ({}))).status).toBe(502);
    mockApi({ "POST /auth/login": new Response("<html>", { status: 502 }) });
    const gateway = await signInThroughApi(req(), "/auth/login", "{}", () => ({}));
    expect(await gateway.json()).toEqual({ error: { code: "bad_gateway", message: "Could not reach DialNFind. Please try again." } });
    expect((await signInThroughApi(req({ origin: "https://evil.example" }), "/auth/login", "{}", () => ({}))).status).toBe(403);
  });
  it("same-origin edge cases", async () => {
    const { crossSiteRejection } = await import("@/lib/same-origin");
    const post = (headers: Record<string, string>) => new Request("http://localhost/x", { method: "POST", headers });
    expect(crossSiteRejection(post({ origin: "null", host: "localhost" }))?.status).toBe(403);
    expect(crossSiteRejection(post({ origin: "http://localhost" }))?.status).toBe(403);
    expect(crossSiteRejection(post({ origin: "https://site.com", "x-forwarded-host": "site.com", host: "internal" }))).toBeNull();
    expect(crossSiteRejection(post({ "sec-fetch-site": "none" }))).toBeNull();
    expect(crossSiteRejection(new Request("http://localhost/x", { method: "HEAD" }))).toBeNull();
    expect(await readJson(new Response("x"))).toBeNull();
  });
});
