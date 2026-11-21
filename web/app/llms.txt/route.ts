import { llmsTxt } from "@/lib/llms";
import { sitemapCategories } from "@/lib/sitemap-data";

// Rebuilt hourly from the live category list, like the sitemap.
export const revalidate = 3600;

export async function GET() {
  const categories = await sitemapCategories()
    .then((r) => r.categories)
    .catch(() => []);
  return new Response(llmsTxt(categories), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
