import { prisma } from "../lib/prisma.js";
import { purgeGeocodeCache } from "../services/geocode.js";
import { sweepOrphanFiles } from "./orphan-files.js";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Removes sign-ins and email links that can no longer be used (keeping a month of history), old geocoder
 * answers, push tokens from devices that have not opened the app in 90 days (the apps refresh theirs on launch)
 * and uploaded files no record uses any more.
 */
export async function cleanup(): Promise<string> {
  const monthAgo = new Date(Date.now() - 30 * DAY);
  const [sessions, tokens, places, devices, files] = await Promise.all([
    prisma.authSession.deleteMany({ where: { OR: [{ expiresAt: { lt: monthAgo } }, { revokedAt: { lt: monthAgo } }] } }),
    prisma.userToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } }),
    purgeGeocodeCache(),
    prisma.pushToken.deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - 90 * DAY) } } }),
    sweepOrphanFiles(),
  ]);
  return `${sessions.count} sessions, ${tokens.count} email links, ${places} cached places, ${devices.count} idle push tokens removed; ${files}`;
}
