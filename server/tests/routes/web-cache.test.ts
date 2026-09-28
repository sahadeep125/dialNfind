import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/env.js";
import { signPreviewToken, verifyPreviewToken, verifyToken } from "../../src/lib/jwt.js";
import { refreshProviderPages, revalidateWeb } from "../../src/services/web-cache.js";
import { api, authed, settle } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, createStaff, createUser } from "../helpers/factories.js";

/** Tags the API asked the website to refresh, across every call so far. */
function refreshedTags(fetch: ReturnType<typeof vi.fn>): string[] {
  return fetch.mock.calls
    .filter(([url]) => String(url) === `${env.webInternalUrl}/api/revalidate`)
    .flatMap(([, init]) => (JSON.parse(String((init as RequestInit).body)) as { tags: string[] }).tags);
}

describe("website cache refresh", () => {
  let fetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    env.revalidateSecret = "test-secret";
    fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
  });
  afterEach(() => {
    env.revalidateSecret = "";
    vi.unstubAllGlobals();
  });

  it("sends the tags with the shared secret, and does nothing without one", async () => {
    revalidateWeb(["provider:a", "provider:a", "categories"]);
    const [url, init] = fetch.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(`${env.webInternalUrl}/api/revalidate`);
    expect(new Headers(init.headers).get("x-revalidate-secret")).toBe("test-secret");
    expect(JSON.parse(String(init.body))).toEqual({ tags: ["provider:a", "categories"] });
    env.revalidateSecret = "";
    revalidateWeb(["categories"]);
    await refreshProviderPages(1n);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never throws when the website is down or refuses", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetch.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(new Response("", { status: 401 }));
    expect(() => revalidateWeb(["categories"])).not.toThrow();
    expect(() => revalidateWeb(["plans"])).not.toThrow();
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("refreshes a profile after the owner edits it, including the old address after a rename", async () => {
    const { user, provider } = await createOwner({ businessName: "Sharma TV", city: "Mumbai", slug: "sharma-tv-mumbai" });
    const owner = await authed(user);
    expect((await owner.put("/api/v1/provider/hours").send({ hours: [] })).status).toBe(200);
    expect(refreshedTags(fetch)).toContain("provider:sharma-tv-mumbai");
    fetch.mockClear();
    const res = await owner.patch("/api/v1/provider/profile").send({ businessName: "Sharma Electronics" });
    expect(res.status).toBe(200);
    expect(refreshedTags(fetch)).toEqual(expect.arrayContaining(["provider:sharma-tv-mumbai", `provider:${res.body.provider.slug}`]));
    expect(res.body.provider.slug).not.toBe(provider.slug);
  });

  it("refreshes when the team approves a listing or edits shared data", async () => {
    const admin = await authed(await createStaff());
    const pending = await createProvider({ status: "pending", slug: "waiting-shop" });
    expect((await admin.patch(`/api/v1/admin/providers/${pending.id}`).send({ status: "active" })).status).toBe(200);
    expect(refreshedTags(fetch)).toEqual(expect.arrayContaining(["provider:waiting-shop", "providers", "categories"]));
    fetch.mockClear();
    const cat = await createCategory();
    expect((await admin.patch(`/api/v1/categories/${cat.id}`).send({ name: "Renamed" })).status).toBe(200);
    expect(refreshedTags(fetch)).toEqual(expect.arrayContaining(["categories", "providers"]));
    fetch.mockClear();
    expect((await admin.put("/api/v1/admin/settings").send({ values: { min_review_length: 20 } })).status).toBe(200);
    expect(refreshedTags(fetch)).toEqual(["app-config"]);
  });
});

describe("listing preview", () => {
  it("signs tokens for one listing that cannot be used to sign in", () => {
    const token = signPreviewToken(42n);
    expect(verifyPreviewToken(token)).toBe(42n);
    expect(verifyToken(token)).toBeNull();
    expect(verifyPreviewToken("garbage")).toBeNull();
  });

  it("shows a pending listing only through its own preview link", async () => {
    const { user, provider } = await createOwner({ status: "pending" });
    const other = await createProvider({ status: "pending" });
    expect((await api().get(`/api/v1/providers/${provider.slug}`)).status).toBe(404);

    const link = await (await authed(user)).get("/api/v1/provider/preview-link");
    expect(link.status).toBe(200);
    expect(link.body.status).toBe("pending");
    const url = new URL(link.body.url);
    expect(url.pathname).toBe(`/providers/${provider.slug}/preview`);
    const token = url.searchParams.get("token")!;

    const shown = await api().get(`/api/v1/providers/${provider.slug}`).query({ previewToken: token, view: "false" });
    expect(shown.status).toBe(200);
    expect(shown.body.provider.status).toBe("pending");
    // The token opens only the listing it was made for.
    expect((await api().get(`/api/v1/providers/${other.slug}`).query({ previewToken: token })).status).toBe(404);
    // And it is not a sign-in.
    expect((await api().get("/api/v1/provider/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("gives the team a preview link for any listing, and nobody else", async () => {
    const provider = await createProvider({ status: "suspended" });
    const admin = await authed(await createStaff());
    const res = await admin.get(`/api/v1/admin/providers/${provider.id}/preview-link`);
    expect(res.body).toMatchObject({ status: "suspended", url: expect.stringContaining(`/providers/${provider.slug}/preview?token=`) });
    expect((await (await authed(await createUser())).get(`/api/v1/admin/providers/${provider.id}/preview-link`)).status).toBe(403);
    expect((await api().get("/api/v1/provider/preview-link")).status).toBe(401);
  });
});
