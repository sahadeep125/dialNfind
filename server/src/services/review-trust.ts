import { createHmac } from "node:crypto";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middleware/auth.js";
import { getNumberSetting } from "./settings.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** For this long after posting, the star rating can change; after it, only the text, and the edit is checked again. */
export const RATING_LOCK_DAYS = 7;
/** Accounts younger than this have their reviews checked before they go live. */
const NEW_ACCOUNT_MS = DAY;
/** This many other reviews of the same business within the window is a burst. */
const BURST_WINDOW_MS = 15 * MINUTE;
const BURST_COUNT = 2;
/** How far back a device is matched against other accounts' reviews of any business. */
const DEVICE_LOOKBACK_MS = 30 * DAY;

export type IneligibleReason = "sign_in" | "verify_email" | "own_business" | "no_contact" | "too_soon";

export type ReviewEligibility = { canReview: true; leadId: bigint } | { canReview: false; reason: IneligibleReason; availableAt: Date | null };

/**
 * Who may review a business: a signed-in customer with a confirmed email who contacted it through
 * DialNFind (tapped Call or WhatsApp while signed in), once they said the business responded or once
 * `review_min_contact_hours` have passed since the contact. The contact the review is linked to is the
 * newest one that qualifies.
 */
export async function reviewEligibility(user: AuthUser | undefined, provider: { id: bigint; userId: bigint | null }): Promise<ReviewEligibility> {
  if (!user) return { canReview: false, reason: "sign_in", availableAt: null };
  if (provider.userId === user.id) return { canReview: false, reason: "own_business", availableAt: null };
  if (!user.emailVerified) return { canReview: false, reason: "verify_email", availableAt: null };

  const waitMs = (await getNumberSetting("review_min_contact_hours", 4)) * HOUR;
  const contacts = { providerId: provider.id, userId: user.id, review: null };
  const ready = await prisma.lead.findFirst({
    where: { ...contacts, OR: [{ customerReportedResponse: true }, { createdAt: { lte: new Date(Date.now() - waitMs) } }] },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (ready) return { canReview: true, leadId: ready.id };

  const first = await prisma.lead.findFirst({ where: contacts, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  if (!first) return { canReview: false, reason: "no_contact", availableAt: null };
  return { canReview: false, reason: "too_soon", availableAt: new Date(first.createdAt.getTime() + waitMs) };
}

/** What the apps get: whether to show "Write a review", and if not, why. */
export function publicEligibility(e: ReviewEligibility) {
  return e.canReview ? { canReview: true, reason: null, availableAt: null } : e;
}

/** A keyed hash, so matching reviews by IP or device never needs the raw value stored. */
export function trustHash(kind: "ip" | "device", value: string | undefined | null) {
  if (!value) return null;
  return createHmac("sha256", env.jwtSecret).update(`review-${kind}:${value}`).digest("hex").slice(0, 40);
}

export type HoldReason = "new_account" | "no_contact" | "burst" | "shared_ip" | "shared_device" | "one_star_unclaimed" | "edited_after_lock";

/** Reasons to hold a new review for the admin team instead of publishing it. Empty means publish. */
export async function holdReasons(input: {
  userId: bigint;
  userCreatedAt: Date;
  providerId: bigint;
  providerClaimed: boolean;
  rating: number;
  leadId: bigint | null;
  ipHash: string | null;
  deviceHash: string | null;
}): Promise<HoldReason[]> {
  const now = Date.now();
  const others = { providerId: input.providerId, userId: { not: input.userId } };
  const [recent, sameIp, sameDevice] = await Promise.all([
    prisma.review.count({ where: { ...others, createdAt: { gt: new Date(now - BURST_WINDOW_MS) } } }),
    // Mobile networks share IPs between many people, so an IP only counts against the same business.
    input.ipHash ? prisma.review.count({ where: { ...others, ipHash: input.ipHash } }) : 0,
    input.deviceHash
      ? prisma.review.count({ where: { userId: { not: input.userId }, deviceHash: input.deviceHash, createdAt: { gt: new Date(now - DEVICE_LOOKBACK_MS) } } })
      : 0,
  ]);

  const reasons: HoldReason[] = [];
  if (now - input.userCreatedAt.getTime() < NEW_ACCOUNT_MS) reasons.push("new_account");
  if (!input.leadId) reasons.push("no_contact");
  if (recent >= BURST_COUNT) reasons.push("burst");
  if (sameIp > 0) reasons.push("shared_ip");
  if (sameDevice > 0) reasons.push("shared_device");
  if (input.rating === 1 && !input.providerClaimed) reasons.push("one_star_unclaimed");
  return reasons;
}

/** When the star rating stops being editable. */
export function ratingLockedAt(createdAt: Date) {
  return new Date(createdAt.getTime() + RATING_LOCK_DAYS * DAY);
}

/** The signed-in customer's own review of a business, as the profile screens show it. */
export function ownReview(r: { id: bigint; rating: number; reviewText: string | null; status: string; createdAt: Date; photos: { photoUrl: string }[] }) {
  return {
    id: r.id,
    rating: r.rating,
    reviewText: r.reviewText,
    photos: r.photos.map((p) => p.photoUrl),
    status: r.status,
    createdAt: r.createdAt,
    ratingLockedAt: ratingLockedAt(r.createdAt),
    ratingLocked: ratingLockedAt(r.createdAt).getTime() <= Date.now(),
  };
}
