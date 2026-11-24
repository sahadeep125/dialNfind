import type { Prisma } from "@prisma/client";
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { conflict, notFound } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";
import { revokeSession, startSession } from "../../services/sessions.js";
import { isProduction } from "../../env.js";
import { getSetting } from "../../services/settings.js";
import { limits } from "../../lib/rate-limit.js";
import { privateFileUrl } from "../../lib/private-files.js";
import { createListing, newListingSchema } from "../../services/listings.js";
import { captureServer } from "../../services/analytics.js";
import { assertCanOwnAnother, MAX_LISTINGS_PER_ACCOUNT, professionLabel } from "../../services/professions.js";
import { LISTING_HEADER } from "./common.js";

export const onboardingRouter = Router();

const listingSelect = {
  id: true,
  slug: true,
  businessName: true,
  businessType: true,
  profession: true,
  locality: true,
  city: true,
  status: true,
  profileCompletenessPct: true,
  verificationStatus: true,
  createdAt: true,
  services: {
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
    take: 1,
    select: { category: { select: { id: true, name: true, professionName: true } }, subcategory: { select: { name: true, professionName: true } } },
  },
} satisfies Prisma.ProviderSelect;

/**
 * GET /provider/me — onboarding state for the provider apps' routers. `provider` is the listing the
 * X-Listing-Id header names (else the first one); `listings` is every listing the account owns, so the
 * apps can switch between an individual's professions. `canAddListing` says whether another may be added.
 */
onboardingRouter.get("/me", async (req, res) => {
  const user = currentUser(req);
  const [owned, claims] = await Promise.all([
    prisma.provider.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: listingSelect }),
    prisma.providerClaim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { provider: { select: { id: true, businessName: true, city: true, locality: true, phone: true } } },
    }),
  ]);
  const listings = owned.map(({ services, createdAt: _createdAt, ...p }) => ({
    ...p,
    professionLabel: professionLabel(p, services[0]),
    primaryCategory: services[0] ? { id: services[0].category.id, name: services[0].category.name } : null,
  }));
  const wanted = req.get(LISTING_HEADER);
  const provider = listings.find((l) => String(l.id) === wanted) ?? listings[0] ?? null;
  const accountType = listings[0] ? (listings[0].businessType === "individual" ? "individual" : "business") : null;
  res.json({
    provider,
    listings,
    accountType,
    canAddListing: listings.length === 0 || (accountType === "individual" && listings.length < MAX_LISTINGS_PER_ACCOUNT),
    maxListings: MAX_LISTINGS_PER_ACCOUNT,
    claims: claims.map((c) => ({
      id: c.id,
      status: c.status,
      method: c.method,
      createdAt: c.createdAt,
      provider: { ...c.provider, phone: maskPhone(c.provider.phone) },
    })),
  });
});

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? phone : `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/** Customers who start onboarding become providers; returns a fresh token carrying the new role. */
/** A customer who starts a business becomes a provider; their sign-in is swapped for one with the new role. */
async function ensureProviderRole(req: Request) {
  const { id: userId, sessionId } = currentUser(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === "customer") {
    await prisma.user.update({ where: { id: userId }, data: { role: "provider" } });
    const token = await startSession(userId, "provider", req);
    await revokeSession(sessionId);
    return token;
  }
  return null;
}

/**
 * POST /provider/onboarding — create a brand-new listing owned by the signed-in user. The first listing
 * sets the account type. An individual professional may come back to add a listing for each other
 * profession; a business has one listing.
 */
onboardingRouter.post("/onboarding", async (req, res) => {
  const body = parse(newListingSchema, req.body);
  const user = currentUser(req);
  const primary = body.services.find((s) => s.isPrimary) ?? body.services[0];
  await assertCanOwnAnother(user.id, { businessType: body.businessType, profession: body.profession, primary });

  const token = await ensureProviderRole(req);
  // Controlled by the auto_approve_listings setting in the admin app.
  const autoApprove = ((await getSetting("auto_approve_listings")) ?? String(!isProduction)) === "true";
  const provider = await createListing(body, { ownerId: user.id, status: autoApprove ? "active" : "pending" });
  captureServer(user.id, "provider_onboarded", { provider_id: Number(provider.id), status: provider.status, was_customer: token !== null, business_type: provider.businessType });
  res.status(201).json({ provider: { id: provider.id, slug: provider.slug, status: provider.status }, token });
});

// Claim an existing listing -------------------------------------------------------------------

const claimSearchSchema = z.object({ q: z.string().trim().min(2).max(100), city: z.string().trim().max(60).optional() });

/** GET /provider/claims/search — find an unclaimed listing to claim. */
onboardingRouter.get("/claims/search", async (req, res) => {
  const { q, city } = parse(claimSearchSchema, req.query);
  const like = `%${q}%`;
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM providers
    WHERE status = 'active'
      AND (business_name ILIKE ${like} OR similarity(business_name, ${q}) > 0.3 OR phone LIKE ${"%" + q.replace(/\D/g, "") + "%"} AND length(${q.replace(/\D/g, "")}) >= 6)
      AND (${city ?? ""} = '' OR city ILIKE ${city ?? ""})
    ORDER BY similarity(business_name, ${q}) DESC
    LIMIT 10`;
  const providers = await prisma.provider.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: {
      id: true,
      businessName: true,
      slug: true,
      locality: true,
      city: true,
      phone: true,
      userId: true,
      avgRating: true,
      totalReviews: true,
      services: { take: 1, orderBy: { isPrimary: "desc" }, include: { category: { select: { name: true } } } },
    },
  });
  res.json({
    results: providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      slug: p.slug,
      locality: p.locality,
      city: p.city,
      phone: maskPhone(p.phone),
      category: p.services[0]?.category.name ?? null,
      avgRating: p.avgRating,
      totalReviews: p.totalReviews,
      isClaimed: p.userId !== null,
    })),
  });
});

/** GET /provider/claims/listing/:id — a single listing, for claim links coming from the website. */
onboardingRouter.get("/claims/listing/:id", async (req, res) => {
  const p = await prisma.provider.findUnique({
    where: { id: idParam(req.params.id) },
    select: {
      id: true,
      businessName: true,
      slug: true,
      locality: true,
      city: true,
      phone: true,
      userId: true,
      status: true,
      avgRating: true,
      totalReviews: true,
      services: { take: 1, orderBy: { isPrimary: "desc" }, include: { category: { select: { name: true } } } },
    },
  });
  if (!p || p.status !== "active") throw notFound("Listing not found");
  res.json({
    listing: {
      id: p.id,
      businessName: p.businessName,
      slug: p.slug,
      locality: p.locality,
      city: p.city,
      phone: maskPhone(p.phone),
      category: p.services[0]?.category.name ?? null,
      avgRating: p.avgRating,
      totalReviews: p.totalReviews,
      isClaimed: p.userId !== null,
    },
  });
});

const startClaimSchema = z.object({
  providerId: z.number().int().positive(),
  documentUrl: privateFileUrl,
});

/** POST /provider/claims — start a claim with a document that proves ownership; the admin team reviews it. */
onboardingRouter.post("/claims", limits.claims, async (req, res) => {
  const body = parse(startClaimSchema, req.body);
  const user = currentUser(req);
  const [provider, owned, pending] = await Promise.all([
    prisma.provider.findUnique({ where: { id: BigInt(body.providerId) } }),
    prisma.provider.findFirst({ where: { userId: user.id }, select: { id: true } }),
    prisma.providerClaim.findFirst({ where: { providerId: BigInt(body.providerId), userId: user.id, status: "pending" }, select: { id: true } }),
  ]);
  if (!provider || provider.status !== "active") throw notFound("Listing not found");
  if (provider.userId) throw conflict("This listing has already been claimed. Contact support if you believe this is a mistake.");
  if (owned) throw conflict("Your account already manages a listing. Claiming is for accounts with no listing yet; contact support to move a listing to this account.");
  if (pending) throw conflict("You already sent a claim for this listing. We will let you know once it is reviewed.");

  const token = await ensureProviderRole(req);
  const claim = await prisma.providerClaim.create({
    data: { providerId: provider.id, userId: user.id, method: "document", documentUrl: body.documentUrl },
  });
  res.status(201).json({ claim: { id: claim.id, status: claim.status, method: claim.method }, token });
});
