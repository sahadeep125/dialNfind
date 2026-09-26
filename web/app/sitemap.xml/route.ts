import { SITE_URL } from "@/lib/config";
import { sitemapIds } from "@/lib/sitemap-data";

// Next builds each sitemap file from app/sitemaps/sitemap.ts but no index, so this lists them.
export const revalidate = 3600;

export async function GET() {
  const ids = await sitemapIds();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map((id) => `  <sitemap><loc>${SITE_URL}/sitemaps/sitemap/${id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
