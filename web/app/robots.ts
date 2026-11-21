import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/** Private pages, the API proxy and filtered result pages (endless combinations) stay out for every crawler. */
const PRIVATE = ["/dashboard", "/api/", "/monitoring", "/search?", "/cdn-cgi/"];

/**
 * AI search and assistant crawlers, named so it is explicit that they are welcome: ChatGPT (GPTBot, OAI-SearchBot,
 * ChatGPT-User), Claude (ClaudeBot, Claude-SearchBot, Claude-User), Perplexity (PerplexityBot, Perplexity-User),
 * Gemini (Google-Extended) and Apple Intelligence (Applebot-Extended). /llms.txt gives them a map of the site.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Sign-in pages stay crawlable so search engines can see their noindex tag.
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // A crawler named in its own group ignores the "*" group, so it gets the same rules here.
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
