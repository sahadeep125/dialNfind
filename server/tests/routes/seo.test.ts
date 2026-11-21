import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { env } from "../../src/env.js";
import { recalculateProvider } from "../../src/services/ranking.js";
import { api, authed } from "../helpers/app.js";
import { createCategory, createOwner, createProvider, createStaff } from "../helpers/factories.js";

const pub = (key: string) => `${env.publicUrl}/uploads/${key}`;

async function electrician(over: Parameters<typeof createOwner>[0] = {}) {
  const cat = await createCategory({ name: "Electricians", slug: "electricians" }, ["Wiring"]);
  const owned = await createOwner({ businessName: "Sharma Electricals", slug: "sharma-electricals", city: "Siliguri", state: "West Bengal", locality: "Hakimpara", categoryId: cat.id, ...over });
  await recalculateProvider(owned.provider.id);
  return { cat, ...owned };
}

describe("provider SEO in the business dashboard", () => {
  it("shows the SEO report with the profile and scores unsaved edits live", async () => {
    const { user, provider } = await electrician();
    const c = await authed(user);
    const { seo } = (await c.get("/api/v1/provider/profile")).body.provider;
    expect(seo).toMatchObject({
      title: "Sharma Electricals: Electrician in Siliguri | KaajVa",
      titleSource: "automatic",
      focusKeyword: "electrician in Siliguri",
      focusKeywordSource: "automatic",
      service: "Electrician",
      indexable: true,
    });
    expect(seo.checks.length).toBeGreaterThan(15);
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } })).seoScore).toBe(seo.score);

    const live = await c.post("/api/v1/provider/seo/check").send({ seoTitle: "Electrician in Siliguri for wiring and inverters", seoKeywords: ["inverter repair Siliguri", "house wiring Siliguri"] });
    expect(live.status).toBe(200);
    expect(live.body.seo.title).toBe("Electrician in Siliguri for wiring and inverters | KaajVa");
    expect(live.body.seo.score).toBeGreaterThan(seo.score);
    // Nothing was saved.
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } })).seoTitle).toBeNull();
    expect((await api().post("/api/v1/provider/seo/check").send({})).status).toBe(401);
    // No body at all is a check of the saved profile.
    expect((await c.post("/api/v1/provider/seo/check")).body.seo.score).toBe(seo.score);
  });

  it("saves SEO text, rejects bad input and keeps search visibility for the team", async () => {
    const { user, provider } = await electrician();
    const c = await authed(user);
    const saved = await c.patch("/api/v1/provider/profile").send({
      seoTitle: "  Sharma Electricals: Electrician in Siliguri  ",
      seoDescription: "",
      focusKeyword: "electrician in Siliguri",
      seoKeywords: ["house wiring Siliguri", "House wiring Siliguri", "inverter repair"],
      seoNoIndex: true,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.provider).toMatchObject({ seoTitle: "Sharma Electricals: Electrician in Siliguri", seoDescription: null, seoKeywords: ["house wiring Siliguri", "inverter repair"], seoNoIndex: false });
    expect(saved.body.provider.seo.titleSource).toBe("custom");
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } })).seoScore).toBe(saved.body.provider.seo.score);

    expect((await c.patch("/api/v1/provider/profile").send({ seoTitle: "Short" })).status).toBe(400);
    expect((await c.patch("/api/v1/provider/profile").send({ seoTitle: "x".repeat(71) })).status).toBe(400);
    expect((await c.patch("/api/v1/provider/profile").send({ seoDescription: "<script>alert(1)</script> and a lot more text to pass the length" })).status).toBe(400);
    expect((await c.patch("/api/v1/provider/profile").send({ seoKeywords: Array.from({ length: 11 }, (_, i) => `keyword ${i}`) })).status).toBe(400);
  });

  it("re-scores photos when their titles change", async () => {
    const { user, provider } = await electrician();
    const c = await authed(user);
    const item = (await c.post("/api/v1/provider/portfolio").send({ title: "IMG 2034", imageUrl: pub("a.webp") })).body.item;
    const before = (await c.get("/api/v1/provider/profile")).body.provider.seo;
    expect(before.checks.find((x: { key: string }) => x.key === "alt_text").status).toBe("fail");
    await c.patch(`/api/v1/provider/portfolio/${item.id}`).send({ title: "Inverter installation in Hakimpara" });
    const after = (await c.get("/api/v1/provider/profile")).body.provider.seo;
    expect(after.checks.find((x: { key: string }) => x.key === "alt_text").status).toBe("pass");
    expect((await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } })).seoScore).toBe(after.score);
  });
});

describe("provider SEO in the admin console", () => {
  it("lists, filters and sorts by SEO score, edits SEO text and hides pages from search", async () => {
    const boss = await authed(await createStaff());
    expect((await boss.get("/api/v1/admin/overview")).body.seo).toEqual({ average: 0, good: 0, fair: 0, poor: 0, hidden: 0 });
    const { provider } = await electrician();
    const weak = await createProvider({ businessName: "WEAK LISTING", slug: "weak" });
    await recalculateProvider(weak.id);
    const strong = await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } });
    expect(strong.seoScore).toBeGreaterThan((await prisma.provider.findUniqueOrThrow({ where: { id: weak.id } })).seoScore);

    const asc = await boss.get("/api/v1/admin/providers").query({ sort: "seo_asc" });
    expect(asc.body.providers[0]).toMatchObject({ id: Number(weak.id), seoNoIndex: false });
    expect(asc.body.providers[0]).toHaveProperty("seoScore");
    expect((await boss.get("/api/v1/admin/providers").query({ sort: "seo_desc" })).body.providers[0].id).toBe(Number(provider.id));
    expect((await boss.get("/api/v1/admin/providers").query({ seo: "poor" })).body.providers.map((p: { id: number }) => p.id)).toContain(Number(weak.id));
    expect((await boss.get("/api/v1/admin/providers").query({ seo: "good" })).body.providers).toEqual([]);

    const profile = await boss.get(`/api/v1/admin/providers/${provider.id}/profile`);
    expect(profile.body.provider.seo.score).toBe(strong.seoScore);
    const live = await boss.post(`/api/v1/admin/providers/${provider.id}/seo/check`).send({ businessName: "SHARMA ELECTRICALS 9876543210" });
    expect(live.body.seo.checks.find((x: { key: string }) => x.key === "business_name").status).toBe("fail");
    expect((await boss.post(`/api/v1/admin/providers/${provider.id}/seo/check`)).body.seo.score).toBe(strong.seoScore);

    const hidden = await boss.patch(`/api/v1/admin/providers/${provider.id}/profile`).send({ seoNoIndex: true, focusKeyword: "electrician near me" });
    expect(hidden.body.provider).toMatchObject({ seoNoIndex: true, focusKeyword: "electrician near me" });
    expect(hidden.body.provider.seo).toMatchObject({ indexable: false, focusKeyword: "electrician near me" });
    expect((await boss.get("/api/v1/admin/providers").query({ seo: "noindex" })).body.providers).toHaveLength(1);
    const csv = (await boss.get("/api/v1/admin/export/providers").buffer(true).parse((res, cb) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => cb(null, data));
    })).body as string;
    expect(csv).toContain("seo_score,hidden_from_search");
    expect(csv.split("\r\n").find((l) => l.includes("Sharma Electricals"))).toMatch(/,yes,/);

    // The public page still opens, tells search engines to stay away, and leaves the sitemap.
    const page = await api().get("/api/v1/providers/sharma-electricals");
    expect(page.body.provider.seo).toMatchObject({ noIndex: true, focusKeyword: "electrician near me" });
    expect((await api().get("/api/v1/providers/sitemap")).body.results.map((r: { slug: string }) => r.slug)).toEqual(["weak"]);

    expect((await boss.post("/api/v1/admin/providers/bulk").send({ ids: [Number(provider.id), Number(weak.id)], action: "show_in_search" })).body.updated).toBe(1);
    expect((await boss.post("/api/v1/admin/providers/bulk").send({ ids: [Number(weak.id)], action: "hide_from_search" })).body.updated).toBe(1);
    expect((await api().get("/api/v1/providers/sitemap")).body.results.map((r: { slug: string }) => r.slug)).toEqual(["sharma-electricals"]);

    const overview = await boss.get("/api/v1/admin/overview");
    expect(overview.body.seo).toMatchObject({ hidden: 1 });
    expect(overview.body.seo.good + overview.body.seo.fair + overview.body.seo.poor).toBe(2);
  });
});

describe("provider SEO on the public page", () => {
  it("returns the page title, description, keywords and photo alt text", async () => {
    const { user } = await electrician({ description: "We are an electrician in Siliguri for house wiring and inverters." });
    const c = await authed(user);
    await c.post("/api/v1/provider/portfolio").send({ title: "Inverter installation", imageUrl: pub("a.webp") });
    await c.post("/api/v1/provider/portfolio").send({ title: "IMG 1", imageUrl: pub("b.webp") });
    const { provider } = (await api().get("/api/v1/providers/sharma-electricals")).body;
    expect(provider.seo).toMatchObject({
      title: "Sharma Electricals: Electrician in Siliguri | KaajVa",
      focusKeyword: "electrician in Siliguri",
      service: "Electrician",
      noIndex: false,
    });
    expect(provider.seo.description).toMatch(/^Sharma Electricals: Electrician in Siliguri \(Hakimpara\)\./);
    expect(provider.seo.keywords).toContain("electrician near me");
    expect(provider.portfolio.map((p: { altText: string }) => p.altText).sort()).toEqual(["Electrician work by Sharma Electricals, Siliguri", "Inverter installation by Sharma Electricals, Siliguri"]);
  });
});
