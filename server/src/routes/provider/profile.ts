import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { notFound } from "../../lib/errors.js";
import { num } from "../../lib/serialize.js";
import { uniqueProviderSlug } from "../../lib/slug.js";
import { completenessChecklist, recalculateCategoryCounts, recalculateProvider } from "../../services/ranking.js";
import { ownProvider } from "./common.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "./shared.js";

export const profileRouter = Router();

async function loadProfile(providerId: bigint) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
    include: {
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      serviceAreas: { orderBy: { areaName: "asc" } },
      services: { include: { category: true, subcategory: true }, orderBy: [{ isPrimary: "desc" }, { id: "asc" }] },
      portfolio: { orderBy: { createdAt: "desc" } },
      badges: { include: { badge: true } },
      _count: { select: { businessHours: true, serviceAreas: true, services: true, portfolio: true } },
    },
  });
  const { _count, location: _location, ...rest } = provider as typeof provider & { location?: unknown };
  return {
    ...rest,
    services: provider.services.map((s) => ({ ...s, startingPrice: num(s.startingPrice) })),
    checklist: completenessChecklist(provider),
  };
}

profileRouter.get("/profile", async (req, res) => {
  const provider = await ownProvider(req);
  res.json({ provider: await loadProfile(provider.id) });
});

const profileSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable(),
  businessType: z.enum(["individual", "company"]),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  selfReportedCompletedJobs: z.number().int().min(0).max(1_000_000).nullable(),
  phone: z.string().trim().min(8).max(20),
  whatsappNumber: z.string().trim().max(20).nullable(),
  email: z.string().email().nullable().or(z.literal("").transform(() => null)),
  website: z.string().url().nullable().or(z.literal("").transform(() => null)),
  logoUrl: z.string().url().nullable().or(z.literal("").transform(() => null)),
  coverUrl: z.string().url().nullable().or(z.literal("").transform(() => null)),
  addressLine: z.string().trim().max(200).nullable(),
  locality: z.string().trim().max(80).nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().max(10).nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(100),
  acceptsCalls: z.boolean(),
  acceptsWhatsapp: z.boolean(),
  isAvailable: z.boolean(),
});

profileRouter.patch("/profile", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(profileSchema.partial(), req.body);
  const renamed = (body.businessName && body.businessName !== provider.businessName) || (body.city && body.city !== provider.city);
  const slug = renamed ? await uniqueProviderSlug(body.businessName ?? provider.businessName, body.city ?? provider.city, provider.id) : undefined;
  await prisma.provider.update({ where: { id: provider.id }, data: { ...body, ...(slug ? { slug } : {}) } });
  await recalculateProvider(provider.id);
  res.json({ provider: await loadProfile(provider.id) });
});

profileRouter.put("/hours", async (req, res) => {
  const provider = await ownProvider(req);
  const hours = parse(z.object({ hours: hoursSchema }), req.body).hours;
  await prisma.$transaction((tx) => replaceHours(tx, provider.id, hours));
  await recalculateProvider(provider.id);
  res.json({ provider: await loadProfile(provider.id) });
});

profileRouter.put("/service-areas", async (req, res) => {
  const provider = await ownProvider(req);
  const { serviceAreas } = parse(z.object({ serviceAreas: z.array(serviceAreaSchema).max(50) }), req.body);
  await prisma.$transaction((tx) => replaceServiceAreas(tx, provider.id, serviceAreas));
  await recalculateProvider(provider.id);
  res.json({ provider: await loadProfile(provider.id) });
});

profileRouter.put("/services", async (req, res) => {
  const provider = await ownProvider(req);
  const { services } = parse(z.object({ services: z.array(serviceSchema).min(1).max(30) }), req.body);
  await prisma.$transaction((tx) => replaceServices(tx, provider.id, services));
  await recalculateProvider(provider.id);
  await recalculateCategoryCounts();
  res.json({ provider: await loadProfile(provider.id) });
});

// Portfolio ---------------------------------------------------------------------------------

const portfolioSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().url(),
  categoryId: z.number().int().positive().nullable().optional(),
});

profileRouter.post("/portfolio", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(portfolioSchema, req.body);
  const item = await prisma.providerPortfolio.create({
    data: { ...body, categoryId: body.categoryId ? BigInt(body.categoryId) : null, providerId: provider.id },
  });
  await recalculateProvider(provider.id);
  res.status(201).json({ item });
});

profileRouter.patch("/portfolio/:id", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(portfolioSchema.partial(), req.body);
  const id = idParam(req.params.id as string);
  const existing = await prisma.providerPortfolio.findUnique({ where: { id } });
  if (!existing || existing.providerId !== provider.id) throw notFound("Portfolio item not found");
  const item = await prisma.providerPortfolio.update({
    where: { id },
    data: { ...body, categoryId: body.categoryId === undefined ? undefined : body.categoryId ? BigInt(body.categoryId) : null },
  });
  res.json({ item });
});

profileRouter.delete("/portfolio/:id", async (req, res) => {
  const provider = await ownProvider(req);
  const id = idParam(req.params.id as string);
  const existing = await prisma.providerPortfolio.findUnique({ where: { id } });
  if (!existing || existing.providerId !== provider.id) throw notFound("Portfolio item not found");
  await prisma.providerPortfolio.delete({ where: { id } });
  await recalculateProvider(provider.id);
  res.json({ ok: true });
});

// Verification ------------------------------------------------------------------------------

profileRouter.get("/verifications", async (req, res) => {
  const provider = await ownProvider(req);
  const verifications = await prisma.verification.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" } });
  res.json({ verificationStatus: provider.verificationStatus, verifications });
});

const verificationSchema = z.object({
  type: z.enum(["business", "location", "id_proof"]),
  documentUrl: z.string().url(),
  notes: z.string().trim().max(500).optional(),
});

/** Providers can only submit; approval is an admin action. */
profileRouter.post("/verifications", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(verificationSchema, req.body);
  const verification = await prisma.verification.create({ data: { ...body, providerId: provider.id } });
  res.status(201).json({ verification });
});
