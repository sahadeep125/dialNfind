import "server-only";
import { publicApi } from "./api";
import type { Category } from "./types";

/** Google reads at most 50,000 URLs per sitemap file. */
export const PROVIDERS_PER_SITEMAP = 45000;

export interface SitemapPage {
  results: { slug: string; updatedAt: string }[];
  total: number;
  totalPages: number;
}

export const sitemapProviders = (page: number) =>
  publicApi<SitemapPage>("/providers/sitemap", { query: { page, pageSize: PROVIDERS_PER_SITEMAP }, revalidate: 3600, tags: ["sitemap"] });

export const sitemapCategories = () => publicApi<{ categories: Category[] }>("/categories", { revalidate: 3600, tags: ["categories"] });

/** File 0 holds pages and categories; files 1..n hold providers. */
export async function sitemapIds(): Promise<number[]> {
  const first = await sitemapProviders(1).catch(() => null);
  const providerFiles = first ? Math.max(1, Math.ceil(first.total / PROVIDERS_PER_SITEMAP)) : 1;
  return [0, ...Array.from({ length: providerFiles }, (_, i) => i + 1)];
}
