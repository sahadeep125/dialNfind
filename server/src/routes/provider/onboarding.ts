import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";
import { uniqueProviderSlug } from "../../lib/slug.js";
import { signToken } from "../../lib/jwt.js";
import { env, isProduction } from "../../env.js";
import { recalculateCategoryCounts, recalculateProvider } from "../../services/ranking.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "./shared.js";

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
async function ensureProviderRole(userId: bigint) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === "customer") {
    await prisma.user.update({ where: { id: userId }, data: { role: "provider" } });
    return signToken(userId, "provider");
  }
  return null;
}

const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  businessType: z.enum(["individual", "company"]).default("individual"),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  phone: z.string().trim().min(8).max(20),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().url().nullable().optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().max(10).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(100).default(10),
  acceptsCalls: z.boolean().default(true),
  acceptsWhatsapp: z.boolean().default(true),
  services: z.array(serviceSchema).min(1, "Pick at least one service"),
  serviceAreas: z.array(serviceAreaSchema).max(50).default([]),
  hours: hoursSchema.optional(),
});

/** POST /provider/onboarding — create a brand-new listing owned by the signed-in user. */
onboardingRouter.post("/onboarding", async (req, res) => {
  const body = parse(onboardingSchema, req.body);
  const user = currentUser(req);
  const existing = await prisma.provider.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (existing) throw conflict("You already have a business profile");

  const token = await ensureProviderRole(user.id);
  const slug = await uniqueProviderSlug(body.businessName, body.city);
  const { services, serviceAreas, hours, ...profile } = body;

  const provider = await prisma.$transaction(async (tx) => {
    const created = await tx.provider.create({
      data: {
        ...profile,
        email: profile.email || null,
        website: profile.website || null,
        slug,
        userId: user.id,
        claimedAt: new Date(),
        // New listings go live immediately in development; production waits for admin approval.
        status: isProduction ? "pending" : "active",
      },
    });
    await replaceServices(tx, created.id, services);
    await replaceServiceAreas(tx, created.id, serviceAreas);
    if (hours) await replaceHours(tx, created.id, hours);
    return created;
  });

  await recalculateProvider(provider.id);
  await recalculateCategoryCounts();
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

const startClaimSchema = z.object({
  providerId: z.number().int().positive(),
  method: z.enum(["phone_otp", "document"]).default("phone_otp"),
  documentUrl: z.string().url().optional(),
});

/**
 * POST /provider/claims — start a claim. phone_otp sends a code to the listing's number (SMS is
 * stubbed: the development code is DEV_OTP_CODE); document claims wait for admin review.
 */
onboardingRouter.post("/claims", async (req, res) => {
  const body = parse(startClaimSchema, req.body);
  const user = currentUser(req);
  const [provider, owned] = await Promise.all([
    prisma.provider.findUnique({ where: { id: BigInt(body.providerId) } }),
    prisma.provider.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);
  if (!provider || provider.status !== "active") throw notFound("Listing not found");
  if (provider.userId) throw conflict("This listing has already been claimed. Contact support if you believe this is a mistake.");
  if (owned) throw conflict("Your account already manages a business profile");
  if (body.method === "document" && !body.documentUrl) throw badRequest("Upload a document that proves ownership");

  const token = await ensureProviderRole(user.id);
  const code = env.devOtpCode;
  const claim = await prisma.providerClaim.create({
    data: {
      providerId: provider.id,
      userId: user.id,
      method: body.method,
      documentUrl: body.documentUrl,
      otpHash: body.method === "phone_otp" ? await bcrypt.hash(code, 8) : null,
      otpExpires: body.method === "phone_otp" ? new Date(Date.now() + 10 * 60 * 1000) : null,
    },
  });
  res.status(201).json({
    claim: { id: claim.id, status: claim.status, method: claim.method },
    sentTo: body.method === "phone_otp" ? maskPhone(provider.phone) : null,
    // Surfaced only outside production so the flow can be demoed without an SMS gateway.
    devCode: body.method === "phone_otp" && !isProduction ? code : undefined,
    token,
  });
});

const verifyClaimSchema = z.object({ code: z.string().trim().min(4).max(8) });

onboardingRouter.post("/claims/:id/verify", async (req, res) => {
  const { code } = parse(verifyClaimSchema, req.body);
  const user = currentUser(req);
  const claim = await prisma.providerClaim.findUnique({ where: { id: idParam(req.params.id as string) }, include: { provider: true } });
  if (!claim) throw notFound("Claim not found");
  if (claim.userId !== user.id) throw forbidden();
  if (claim.status !== "pending") throw badRequest("This claim is no longer pending");
  if (claim.method !== "phone_otp" || !claim.otpHash) throw badRequest("This claim is waiting for document review");
  if (!claim.otpExpires || claim.otpExpires < new Date()) throw badRequest("The code has expired. Start the claim again.");
  if (!(await bcrypt.compare(code, claim.otpHash))) throw badRequest("That code is not correct");
  if (claim.provider.userId) throw conflict("This listing has already been claimed");

  await prisma.$transaction([
    prisma.providerClaim.update({ where: { id: claim.id }, data: { status: "approved", reviewedAt: new Date(), otpHash: null } }),
    prisma.provider.update({ where: { id: claim.providerId }, data: { userId: user.id, claimedAt: new Date() } }),
    prisma.verification.create({
      data: { providerId: claim.providerId, type: "phone", status: "approved", verifiedAt: new Date(), notes: "Verified by claim OTP" },
    }),
  ]);
  const verification = claim.provider.verificationStatus === "none" ? "partial" : claim.provider.verificationStatus;
  await prisma.provider.update({ where: { id: claim.providerId }, data: { verificationStatus: verification } });
  await recalculateProvider(claim.providerId);
  res.json({ ok: true, provider: { id: claim.providerId, slug: claim.provider.slug } });
});
