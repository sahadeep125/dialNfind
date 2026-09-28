import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { signPreviewToken } from "../lib/jwt.js";

/**
 * Cache tags used by the website's public pages (web/lib/api.ts publicApi). Every write that changes what
 * those pages show must refresh the matching tags, or visitors keep seeing the old data until it expires.
 */
export type SharedTag = "providers" | "categories" | "app-config" | "plans" | "stats" | "reviews" | "sitemap";

const TIMEOUT_MS = 3000;

/**
 * Asks the website to drop cached pages with these tags (web/app/api/revalidate/route.ts). Fire and forget:
 * it never throws and never delays the response, since a website outage must not fail an API write.
 */
export function revalidateWeb(tags: string[]): void {
  if (!env.revalidateSecret || tags.length === 0) return;
  const unique = [...new Set(tags)];
  fetch(`${env.webInternalUrl}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": env.revalidateSecret },
    body: JSON.stringify({ tags: unique }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then((res) => {
      if (!res.ok) console.warn(`[web-cache] refresh of ${unique.join(", ")} answered ${res.status}`);
    })
    .catch((err: unknown) => {
      console.warn(`[web-cache] could not refresh ${unique.join(", ")}:`, err instanceof Error ? err.message : err);
    });
}

/** Refreshes one or more provider profiles by slug, plus the lists that show providers. */
export function refreshProviderSlugs(slugs: (string | null | undefined)[], extra: SharedTag[] = []): void {
  const tags = slugs.filter((s): s is string => !!s).map((slug) => `provider:${slug}`);
  revalidateWeb([...tags, "sitemap", "stats", ...extra]);
}

/** Refreshes provider profiles by id (looks up the slugs). */
export async function refreshProviderPages(providerIds: bigint | bigint[], extra: SharedTag[] = []): Promise<void> {
  if (!env.revalidateSecret) return;
  const ids = Array.isArray(providerIds) ? providerIds : [providerIds];
  if (ids.length === 0) return;
  try {
    const rows = await prisma.provider.findMany({ where: { id: { in: ids } }, select: { slug: true } });
    refreshProviderSlugs(rows.map((r) => r.slug), extra);
  } catch (err) {
    console.warn("[web-cache] could not look up providers to refresh:", err instanceof Error ? err.message : err);
  }
}

/** Refreshes data shared by many pages, e.g. after a category rename or a settings change. */
export function refreshShared(...tags: SharedTag[]): void {
  revalidateWeb(tags);
}

/** A link to the listing on the website that works even before it is live, for the owner and the team. */
export function previewUrl(provider: { id: bigint; slug: string }): string {
  return `${env.webUrl}/providers/${encodeURIComponent(provider.slug)}/preview?token=${signPreviewToken(provider.id)}`;
}
