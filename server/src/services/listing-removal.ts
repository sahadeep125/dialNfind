import type { Provider } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { releaseFile } from "../storage/references.js";
import { logAdmin } from "./audit.js";
import { recalculateCategoryCounts } from "./ranking.js";
import { refreshProviderSlugs } from "./web-cache.js";

/**
 * Deletes listings for good: their leads, reviews, claims, verifications, services and photos go with
 * them (database cascades), then every uploaded file only they used is removed from storage. Each old
 * profile address is remembered so the website redirects it to the listing's category instead of a 404,
 * and the website's pages, sitemap and listings are refreshed. The audit log keeps a snapshot of each.
 */
export async function deleteListings(providers: Provider[], adminId: bigint, opts: { bulk?: boolean } = {}): Promise<number> {
  let deleted = 0;
  const slugs: string[] = [];
  for (const provider of providers) {
    const [portfolio, reviewPhotos, verifications, claims, primary, counts] = await Promise.all([
      prisma.providerPortfolio.findMany({ where: { providerId: provider.id }, select: { imageUrl: true } }),
      prisma.reviewPhoto.findMany({ where: { review: { providerId: provider.id } }, select: { photoUrl: true } }),
      prisma.verification.findMany({ where: { providerId: provider.id }, select: { documentUrl: true } }),
      prisma.providerClaim.findMany({ where: { providerId: provider.id }, select: { documentUrl: true } }),
      prisma.providerService.findFirst({ where: { providerId: provider.id }, orderBy: [{ isPrimary: "desc" }, { id: "asc" }], select: { categoryId: true } }),
      prisma.provider.findUnique({ where: { id: provider.id }, select: { _count: { select: { leads: true, reviews: true } } } }),
    ]);
    if (!counts) continue; // Already gone (deleted twice at once).
    await prisma.$transaction([
      prisma.provider.delete({ where: { id: provider.id } }),
      prisma.removedListing.upsert({
        where: { slug: provider.slug },
        create: { slug: provider.slug, categoryId: primary?.categoryId ?? null },
        update: { categoryId: primary?.categoryId ?? null, deletedAt: new Date() },
      }),
    ]);
    deleted++;
    slugs.push(provider.slug);
    const files = [provider.logoUrl, provider.coverUrl, ...portfolio.map((p) => p.imageUrl), ...reviewPhotos.map((p) => p.photoUrl), ...verifications.map((v) => v.documentUrl), ...claims.map((c) => c.documentUrl)];
    for (const url of files) void releaseFile(url);
    await logAdmin(adminId, "provider.delete", "provider", provider.id, {
      businessName: provider.businessName,
      phone: provider.phone,
      city: provider.city,
      slug: provider.slug,
      ownerId: provider.userId ? Number(provider.userId) : null,
      leads: counts._count.leads,
      reviews: counts._count.reviews,
      ...(opts.bulk ? { bulk: true } : {}),
    });
  }
  if (deleted) {
    refreshProviderSlugs(slugs, ["providers", "reviews"]);
    await recalculateCategoryCounts();
  }
  return deleted;
}

/** Where a deleted listing's old address should send people: its category, or every service if that is gone too. */
export async function removedListingPath(slug: string): Promise<string | null> {
  const removed = await prisma.removedListing.findUnique({ where: { slug } });
  if (!removed) return null;
  const category = removed.categoryId ? await prisma.category.findUnique({ where: { id: removed.categoryId }, select: { slug: true, isActive: true } }) : null;
  return category?.isActive ? `/services/${encodeURIComponent(category.slug)}` : "/services";
}
