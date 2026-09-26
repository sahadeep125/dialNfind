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
    expect(robots.sitemap).toBe("https://dialnfind.com/sitemap.xml");
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/dashboard", "/api/"]));
  });
});

describe("sitemap", () => {
  it("splits providers into files of 45,000", async () => {
    const { sitemapIds } = await import("@/lib/sitemap-data");
    expect(await sitemapIds()).toEqual([0, 1, 2, 3]);
  });
  it("lists pages, categories and subcategories in file 0", async () => {
    const sitemap = (await import("@/app/sitemaps/sitemap")).default;
    const urls = (await sitemap({ id: Promise.resolve("0") })).map((e) => e.url);
    expect(urls).toContain("https://dialnfind.com");
    expect(urls).toContain("https://dialnfind.com/services/electronics-repair");
    expect(urls).toContain("https://dialnfind.com/services/electronics-repair?sub=tv-repair");
  });
  it("lists providers in the later files", async () => {
    const sitemap = (await import("@/app/sitemaps/sitemap")).default;
    const entries = await sitemap({ id: Promise.resolve("2") });
    expect(entries[0]).toMatchObject({ url: "https://dialnfind.com/providers/p-2" });
  });
});
