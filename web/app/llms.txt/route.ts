import { getAppConfig } from "@/lib/app-config";
import { llmsTxt } from "@/lib/llms";
import { sitemapCategories } from "@/lib/sitemap-data";

// Rebuilt hourly from the live category list, like the sitemap.
export const revalidate = 3600;

export async function GET() {
  const [categories, config] = await Promise.all([
    sitemapCategories()
      .then((r) => r.categories)
      .catch(() => []),
    getAppConfig(),
  ]);
  return new Response(llmsTxt(categories, config), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
