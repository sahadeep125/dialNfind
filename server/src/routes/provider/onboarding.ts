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

export const onboardingRouter = Router();

/** GET /provider/me — onboarding state for the provider app's router. */
onboardingRouter.get("/me", async (req, res) => {
  const user = currentUser(req);
  const [provider, claims] = await Promise.all([
    prisma.provider.findUnique({
      where: { userId: user.id },
      select: { id: true, slug: true, businessName: true, status: true, profileCompletenessPct: true, verificationStatus: true },
    }),
    prisma.providerClaim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { provider: { select: { id: true, businessName: true, city: true, locality: true, phone: true } } },
    }),
  ]);
  res.json({
    provider,
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

/** POST /provider/onboarding — create a brand-new listing owned by the signed-in user. */
onboardingRouter.post("/onboarding", async (req, res) => {
  const body = parse(newListingSchema, req.body);
  const user = currentUser(req);
  const existing = await prisma.provider.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (existing) throw conflict("You already have a business profile");

  const token = await ensureProviderRole(req);
  // Controlled by the auto_approve_listings setting in the admin app.
  const autoApprove = ((await getSetting("auto_approve_listings")) ?? String(!isProduction)) === "true";
  const provider = await createListing(body, { ownerId: user.id, status: autoApprove ? "active" : "pending" });
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
    prisma.provider.findUnique({ where: { userId: user.id }, select: { id: true } }),
    prisma.providerClaim.findFirst({ where: { providerId: BigInt(body.providerId), userId: user.id, status: "pending" }, select: { id: true } }),
  ]);
  if (!provider || provider.status !== "active") throw notFound("Listing not found");
  if (provider.userId) throw conflict("This listing has already been claimed. Contact support if you believe this is a mistake.");
  if (owned) throw conflict("Your account already manages a business profile");
  if (pending) throw conflict("You already sent a claim for this listing. We will let you know once it is reviewed.");

  const token = await ensureProviderRole(req);
  const claim = await prisma.providerClaim.create({
    data: { providerId: provider.id, userId: user.id, method: "document", documentUrl: body.documentUrl },
  });
  res.status(201).json({ claim: { id: claim.id, status: claim.status, method: claim.method }, token });
});
