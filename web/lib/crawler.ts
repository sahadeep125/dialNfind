import "server-only";
import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { clientIp } from "./client-ip";

/**
 * Search engine crawlers the API should not rate limit. A crawl of the sitemap requests hundreds of pages
 * from a few addresses, so the API's per-address limit (server/src/lib/rate-limit.ts) used to answer 429 for
 * the last links and those pages failed with 500. A user agent alone can be faked, so a crawler counts
 * only when its address passes the check the search engines document: the reverse DNS name belongs to
 * them and resolves back to the same address.
 * https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot
 */
const CRAWLER_AGENT = /googlebot|google-inspectiontool|googleother|storebot-google|adsbot-google|bingbot|adidxbot/i;
// Not googleusercontent.com: anyone can rent a Google Cloud machine with a name there.
const CRAWLER_HOST = /\.(googlebot\.com|google\.com|search\.msn\.com)$/i;

const DAY = 24 * 60 * 60 * 1000;
const MAX_CACHED = 5000;
const cache = new Map<string, { ok: boolean; until: number }>();
const resolver = new Resolver({ timeout: 1500, tries: 1 });

async function verifyAddress(ip: string): Promise<boolean> {
  try {
    const names = await resolver.reverse(ip);
    for (const name of names.filter((n) => CRAWLER_HOST.test(n.replace(/\.$/, "")))) {
      const addresses = isIP(ip) === 6 ? await resolver.resolve6(name) : await resolver.resolve4(name);
      if (addresses.includes(ip)) return true;
    }
  } catch {
    // No reverse name, or DNS is slow: treat as an ordinary visitor.
  }
  return false;
}

/** True when the request comes from a verified Google or Bing crawler. Each address is checked once a day. */
export async function isVerifiedCrawler(headers: Headers): Promise<boolean> {
  if (!CRAWLER_AGENT.test(headers.get("user-agent") ?? "")) return false;
  const ip = clientIp(headers);
  if (!ip || !isIP(ip)) return false;
  const now = Date.now();
  const hit = cache.get(ip);
  if (hit && hit.until > now) return hit.ok;
  const ok = await verifyAddress(ip);
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  // A failed check is retried sooner, in case DNS was only slow.
  cache.set(ip, { ok, until: now + (ok ? DAY : DAY / 24) });
  return ok;
}

/** For tests. */
export function clearCrawlerCache() {
  cache.clear();
}
