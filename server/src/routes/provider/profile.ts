import { Router } from "express";
import { z } from "zod";
import { httpUrl } from "../../lib/rules.js";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { num } from "../../lib/serialize.js";
import { completenessChecklist, recalculateCategoryCounts, recalculateProvider } from "../../services/ranking.js";
import { applicableAttributes, attributeOptions, decodeAttributeValue, encodeAttributeValue, loadAttributeValues } from "../../services/attributes.js";
import { storage } from "../../storage/index.js";
import { ownProvider } from "./common.js";
import { hoursSchema, replaceHours, replaceServiceAreas, replaceServices, serviceAreaSchema, serviceSchema } from "./shared.js";
import { privateFileUrl } from "../../lib/private-files.js";
import { listingProfileSchema, updateListingProfile } from "../../services/listings.js";

export const profileRouter = Router();

/** The provider's full profile with its checklist, as the provider apps and the admin editor show it. */
export async function loadProfile(providerId: bigint) {
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

profileRouter.patch("/profile", async (req, res) => {
  const provider = await ownProvider(req);
  await updateListingProfile(provider, parse(listingProfileSchema.partial(), req.body));
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

// Service details (category attributes that apply to providers) -------------------------------

/**
 * GET /provider/attributes — the "service details" form. Category-wide questions are asked once per
 * category (stored on that category's anchor service); subcategory questions once per service.
 */
profileRouter.get("/attributes", async (req, res) => {
  const provider = await ownProvider(req);
  const services = await prisma.providerService.findMany({
    where: { providerId: provider.id },
    include: { category: { select: { id: true, name: true } }, subcategory: { select: { id: true, name: true } } },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
  });
  const categoryIds = [...new Set(services.map((s) => s.categoryId))];
  const [attrs, values] = await Promise.all([
    prisma.categoryAttribute.findMany({ where: { appliesTo: "provider", categoryId: { in: categoryIds } }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    loadAttributeValues(prisma, "provider_service", services.map((s) => s.id)),
  ]);
  const shape = (a: (typeof attrs)[number], serviceIds: bigint[]) => {
    const saved = serviceIds.flatMap((id) => values.get(id) ?? []).find((x) => x.attribute.id === a.id);
    return { id: a.id, label: a.label, fieldType: a.fieldType, options: attributeOptions(a), isRequired: a.isRequired, value: saved ? decodeAttributeValue(a, saved.value) : null };
  };
  const groups = [];
  for (const categoryId of categoryIds) {
    const inCategory = services.filter((s) => s.categoryId === categoryId);
    const wide = attrs.filter((a) => a.categoryId === categoryId && !a.subcategoryId);
    if (wide.length) {
      groups.push({
        providerServiceId: inCategory[0].id,
        title: inCategory[0].category.name,
        attributes: wide.map((a) => shape(a, inCategory.map((s) => s.id))),
      });
    }
    for (const s of inCategory) {
      const specific = attrs.filter((a) => a.subcategoryId && a.subcategoryId === s.subcategoryId);
      if (specific.length) groups.push({ providerServiceId: s.id, title: s.subcategory?.name ?? s.category.name, attributes: specific.map((a) => shape(a, [s.id])) });
    }
  }
  res.json({ groups });
});

const attributeValuesSchema = z.object({
  values: z
    .array(
      z.object({
        providerServiceId: z.number().int().positive(),
        attributeId: z.number().int().positive(),
        value: z.union([z.string().max(300), z.number(), z.boolean(), z.array(z.string().max(80)).max(50), z.null()]),
      }),
    )
    .max(200),
});

/** PUT /provider/attributes — upserts values; null clears one. Only the provider's own services are accepted. */
profileRouter.put("/attributes", async (req, res) => {
  const provider = await ownProvider(req);
  const { values } = parse(attributeValuesSchema, req.body);
  const services = await prisma.providerService.findMany({ where: { providerId: provider.id } });
  const serviceById = new Map(services.map((s) => [s.id, s]));
  await prisma.$transaction(async (tx) => {
    for (const v of values) {
      const service = serviceById.get(BigInt(v.providerServiceId));
      if (!service) throw notFound("Service not found on your profile");
      const allowed = await applicableAttributes(tx, "provider", service.categoryId, service.subcategoryId);
      const attr = allowed.find((a) => a.id === BigInt(v.attributeId));
      if (!attr) throw badRequest("That detail does not apply to this service");
      const encoded = encodeAttributeValue(attr, v.value);
      const scope = attr.subcategoryId ? [service.id] : services.filter((x) => x.categoryId === service.categoryId).map((x) => x.id);
      await tx.attributeValue.deleteMany({ where: { attributeId: attr.id, entityType: "provider_service", entityId: { in: scope } } });
      if (encoded !== null) {
        await tx.attributeValue.create({ data: { attributeId: attr.id, entityType: "provider_service", entityId: service.id, value: encoded } });
      }
    }
  });
  res.json({ ok: true });
});

// Portfolio ---------------------------------------------------------------------------------

const portfolioSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: httpUrl,
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
  if (body.imageUrl && body.imageUrl !== existing.imageUrl) void storage.remove(existing.imageUrl);
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
  void storage.remove(existing.imageUrl);
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
  documentUrl: privateFileUrl,
  notes: z.string().trim().max(500).optional(),
});

/** Providers can only submit; approval is an admin action. */
profileRouter.post("/verifications", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(verificationSchema, req.body);
  const verification = await prisma.verification.create({ data: { ...body, providerId: provider.id } });
  res.status(201).json({ verification });
});
