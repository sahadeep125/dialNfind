import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private pages, the API proxy and filtered result pages (endless combinations) are kept out.
        // Sign-in pages stay crawlable so search engines can see their noindex tag.
        disallow: ["/dashboard", "/api/", "/monitoring", "/search?"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
