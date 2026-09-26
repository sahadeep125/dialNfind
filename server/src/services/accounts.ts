import { prisma } from "../lib/prisma.js";
import { storage } from "../storage/index.js";
import { recalculateProvider } from "./ranking.js";
import { revokeAllSessions } from "./sessions.js";
import { revokeAppleToken } from "../lib/oauth.js";
import { liveSubscription } from "./entitlements.js";
import { razorpay, razorpayConfigured } from "./razorpay.js";

/**
 * Closes a business before its owner's account is anonymised: the listing leaves search (suspended),
 * the plan stops renewing, running promotions end and push tokens are dropped. Store subscriptions
 * cannot be cancelled from here, so the store is returned for the app to send the person there.
 */
export async function closeBusinessAccount(userId: bigint): Promise<{ storeSubscription: "app_store" | "play_store" | null }> {
  await prisma.pushToken.deleteMany({ where: { userId } });
  const provider = await prisma.provider.findUnique({ where: { userId }, select: { id: true } });
  if (!provider) return { storeSubscription: null };
  const live = await liveSubscription(provider.id);
  if (live?.source === "razorpay" && live.autoRenew && live.externalId && razorpayConfigured()) {
    await razorpay.cancelSubscription(live.externalId, true).catch((err: unknown) => console.error("[accounts] Razorpay cancel failed", err));
  }
  await prisma.$transaction([
    prisma.provider.update({ where: { id: provider.id }, data: { status: "suspended", isAvailable: false } }),
    prisma.providerSubscription.updateMany({ where: { providerId: provider.id, autoRenew: true }, data: { autoRenew: false } }),
    prisma.sponsoredListing.updateMany({ where: { providerId: provider.id, status: { in: ["active", "paused"] } }, data: { status: "completed" } }),
  ]);
  const store = live?.source === "app_store" || live?.source === "play_store" ? live.source : null;
  return { storeSubscription: store };
}

/**
 * Deletes a person's account: the row is kept so leads, tickets and the audit log stay consistent,
 * but everything that identifies them is cleared and they are signed out everywhere. Their reviews,
 * favourites and addresses are removed. A business they owned stays on DialNFind as an unclaimed listing.
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
  for (const r of reviews) for (const p of r.photos) void storage.remove(p.photoUrl);
  for (const providerId of new Set(reviews.map((r) => r.providerId))) await recalculateProvider(providerId);
  if (user.profilePhotoUrl) void storage.remove(user.profilePhotoUrl);
}
