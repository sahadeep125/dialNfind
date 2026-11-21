import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { GUIDES } from "@/lib/guides";
import { serviceHref } from "@/lib/service-href";
import { areaHref, getCategoryAreas } from "@/lib/category-areas";
import { sitemapCategories, sitemapIds, sitemapProviders } from "@/lib/sitemap-data";

// Served at /sitemaps/sitemap/<id>.xml and listed by the index at /sitemap.xml.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.7, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/claim", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export async function generateSitemaps() {
  return (await sitemapIds()).map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const n = Number(await id);
  if (n === 0) {
    const [{ categories }, areas] = await Promise.all([sitemapCategories(), getCategoryAreas()]);
    return [
      ...STATIC_PAGES.map((p) => ({ url: `${SITE_URL}${p.path === "/" ? "" : p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
      ...categories.flatMap((c) => [
        { url: `${SITE_URL}${serviceHref(c.slug)}`, changeFrequency: "daily" as const, priority: 0.8 },
        ...c.subcategories.map((s) => ({ url: `${SITE_URL}${serviceHref(c.slug, s.slug)}`, changeFrequency: "daily" as const, priority: 0.7 })),
      ]),
      ...areas.map((a) => ({ url: `${SITE_URL}${areaHref(a.category, a.slug)}`, changeFrequency: "weekly" as const, priority: 0.6 })),
      ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, lastModified: new Date(g.dateModified), changeFrequency: "monthly" as const, priority: 0.6 })),
    ];
  }
  const { results } = await sitemapProviders(n);
  return results.map((p) => ({ url: `${SITE_URL}/providers/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly", priority: 0.7 }));
}
