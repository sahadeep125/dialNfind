import { prisma } from "../lib/prisma.js";
import { releaseFile } from "../storage/references.js";
import { recalculateProvider } from "./ranking.js";
import { revokeAllSessions } from "./sessions.js";
import { revokeAppleToken } from "../lib/oauth.js";
import { refreshProviderPages } from "./web-cache.js";

/**
 * Closes a business before its owner's account is anonymised: the listing leaves search (suspended)
 * and push tokens are dropped.
 */
export async function closeBusinessAccount(userId: bigint): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { userId } });
  // An individual professional may have several listings, one per profession: all of them close.
  const listings = await prisma.provider.findMany({ where: { userId }, select: { id: true } });
  if (!listings.length) return;
  await prisma.provider.updateMany({ where: { userId }, data: { status: "suspended", isAvailable: false } });
  for (const provider of listings) void refreshProviderPages(provider.id, ["providers"]);
}

/**
 * Deletes a person's account: the row is kept so leads, tickets and the audit log stay consistent,
 * but everything that identifies them is cleared and they are signed out everywhere. Their reviews,
 * favourites and addresses are removed. A business they owned stays on KaajVa as an unclaimed listing.
 * Google/Apple sign-in links are removed, and Apple is told to revoke our access (App Store requirement).
 */
export async function anonymiseUser(userId: bigint): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const reviews = await prisma.review.findMany({ where: { userId }, select: { providerId: true, photos: { select: { photoUrl: true } } } });
  const appleLinks = await prisma.userOAuthAccount.findMany({
    where: { userId, provider: "apple", refreshToken: { not: null } },
    select: { refreshToken: true, clientId: true },
  });
  await prisma.$transaction([
    prisma.userOAuthAccount.deleteMany({ where: { userId } }),
    prisma.favorite.deleteMany({ where: { userId } }),
    prisma.userAddress.deleteMany({ where: { userId } }),
    prisma.review.deleteMany({ where: { userId } }),
    prisma.userToken.deleteMany({ where: { userId } }),
    prisma.provider.updateMany({ where: { userId }, data: { userId: null, claimedAt: null } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "deleted",
        role: user.role === "super_admin" ? user.role : "customer",
        adminRoleId: null,
        name: "Deleted user",
        email: `deleted-${userId}@deleted.invalid`,
        phone: null,
        passwordHash: null,
        profilePhotoUrl: null,
        emailVerifiedAt: null,
      },
    }),
  ]);
  await revokeAllSessions(userId);
  for (const link of appleLinks) if (link.refreshToken && link.clientId) void revokeAppleToken(link.refreshToken, link.clientId);
  for (const r of reviews) for (const p of r.photos) void releaseFile(p.photoUrl);
  for (const providerId of new Set(reviews.map((r) => r.providerId))) await recalculateProvider(providerId);
  void releaseFile(user.profilePhotoUrl);
}
