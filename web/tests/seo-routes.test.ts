import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  publicApi: vi.fn(async (path: string, options?: { query?: { page?: number } }) => {
    if (path === "/providers/sitemap") {
      return { results: [{ slug: `p-${options?.query?.page}`, updatedAt: "2026-09-01T00:00:00Z" }], total: 90001, totalPages: 3 };
    }
    if (path === "/categories") return { categories: [{ slug: "electronics-repair", subcategories: [{ slug: "tv-repair" }] }] };
    throw new Error(`unexpected ${path}`);
  }),
}));

describe("robots", () => {
  it("points to the sitemap and keeps private areas out", async () => {
    const robots = (await import("@/app/robots")).default();
    expect(robots.sitemap).toBe("https://kaajva.in/sitemap.xml");
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/dashboard", "/api/"]));
  });
});

describe("sitemap", () => {
  it("splits providers into files of 45,000", async () => {
    const { sitemapIds } = await import("@/lib/sitemap-data");
    expect(await sitemapIds()).toEqual([0, 1, 2, 3]);
  });
  it("lists pages, categories, subcategories and guides in file 0", async () => {
    const sitemap = (await import("@/app/sitemaps/sitemap")).default;
    const urls = (await sitemap({ id: Promise.resolve("0") })).map((e) => e.url);
    expect(urls).toContain("https://kaajva.in");
    expect(urls).toContain("https://kaajva.in/services/electronics-repair");
    expect(urls).toContain("https://kaajva.in/services/electronics-repair/tv-repair");
    expect(urls).toContain("https://kaajva.in/guides");
    expect(urls).toContain("https://kaajva.in/guides/tv-repair-cost-india");
    expect(urls.some((u) => u.includes("?sub="))).toBe(false);
  });
  it("lists providers in the later files", async () => {
    const sitemap = (await import("@/app/sitemaps/sitemap")).default;
    const entries = await sitemap({ id: Promise.resolve("2") });
    expect(entries[0]).toMatchObject({ url: "https://kaajva.in/providers/p-2" });
  });
});

describe("llms.txt", () => {
  it("summarises the site and links the pages, services, guides and official profiles", async () => {
    const { llmsTxt } = await import("@/lib/llms");
    const { GUIDES } = await import("@/lib/guides");
    const text = llmsTxt([
      { name: "Electricians", slug: "electricians", providerCount: 12, description: null },
      { name: "Tutors", slug: "tutors", providerCount: 0, description: null },
    ]);
    expect(text).toMatch(/^# KaajVa\n\n> /);
    expect(text).toContain("Siliguri");
    expect(text).toContain("[Electricians in Siliguri](https://kaajva.in/services/electricians): 12 listings");
    expect(text).not.toContain("Tutors in Siliguri");
    for (const g of GUIDES) expect(text).toContain(`(https://kaajva.in/guides/${g.slug})`);
    expect(text).toContain("https://www.instagram.com/kaajvaofficial/");
    expect(llmsTxt([])).not.toContain("## Services in Siliguri");
  });
  it("is served as plain text", async () => {
    const res = await (await import("@/app/llms.txt/route")).GET();
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });
});

describe("robots for AI crawlers", () => {
  it("names the AI crawlers with the same private paths", async () => {
    const { default: robots, AI_CRAWLERS } = await import("@/app/robots");
    const rules = robots().rules;
    const ai = Array.isArray(rules) ? rules[1] : undefined;
    expect(ai?.userAgent).toEqual(AI_CRAWLERS);
    expect(ai?.disallow).toEqual(expect.arrayContaining(["/dashboard", "/api/"]));
  });
});
