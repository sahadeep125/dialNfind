import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";

/** The header the provider apps send to pick which of the account's listings a request is about. */
export const LISTING_HEADER = "x-listing-id";

/** The listing a request asks for: the X-Listing-Id header, else the ?listingId= query parameter. */
function requestedListingId(req: Request): bigint | null {
  const raw = req.get(LISTING_HEADER) ?? (typeof req.query.listingId === "string" ? req.query.listingId : undefined);
  if (raw === undefined || raw === "") return null;
  if (!/^\d{1,18}$/.test(raw)) throw notFound("Listing not found");
  return BigInt(raw);
}

/**
 * Returns the listing owned by the signed-in user that this request is about, or 404 if they have
 * not onboarded yet. An individual professional may own several listings (one per profession): the
 * apps name one with the X-Listing-Id header. Without it the account's first listing is used, so
 * older app versions keep working.
 */
export async function ownProvider(req: Request) {
  const user = currentUser(req);
  if (user.role !== "provider" && user.role !== "super_admin") throw forbidden("Provider account required");
  const listingId = requestedListingId(req);
  const provider = await prisma.provider.findFirst({
    where: { userId: user.id, ...(listingId !== null ? { id: listingId } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!provider) throw notFound(listingId !== null ? "Listing not found" : "You have not set up a profile yet");
  return provider;
}
