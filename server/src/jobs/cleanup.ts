import { prisma } from "../lib/prisma.js";
import { purgeGeocodeCache } from "../services/geocode.js";

const DAY = 24 * 60 * 60 * 1000;

/** Removes sign-ins and email links that can no longer be used (keeping a month of history) and old geocoder answers. */
export async function cleanup(): Promise<string> {
  const monthAgo = new Date(Date.now() - 30 * DAY);
  const [sessions, tokens, places] = await Promise.all([
    prisma.authSession.deleteMany({ where: { OR: [{ expiresAt: { lt: monthAgo } }, { revokedAt: { lt: monthAgo } }] } }),
    prisma.userToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } }),
    purgeGeocodeCache(),
  ]);
  return `${sessions.count} sessions, ${tokens.count} email links, ${places} cached places removed`;
}
