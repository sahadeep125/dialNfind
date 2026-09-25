import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getNumberSetting } from "../services/settings.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { leadsThisMonth, planOf } from "../services/entitlements.js";
import { applicableAttributes, encodeAttributeValue, type AttributeInput } from "../services/attributes.js";
import { notify } from "../services/notify.js";
import { currentUser, optionalAuth, requireAuth } from "../middleware/auth.js";
import { recalculateProvider } from "../services/ranking.js";
import { limits } from "../lib/rate-limit.js";

export const leadsRouter = Router();

const leadSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  channel: z.enum(["call", "whatsapp"]),
  source: z.enum(["search", "ai_match", "category_browse", "profile"]).default("profile"),
  categorySlug: z.string().optional(),
  subcategorySlug: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  /** Answers to the category's lead questions, e.g. "Device type". */
  details: z
    .array(z.object({ attributeId: z.number().int().positive(), value: z.union([z.string().max(300), z.number(), z.boolean(), z.array(z.string().max(80)).max(20)]) }))
    .max(20)
    .optional(),
});

/** Validates lead answers against the category's lead questions before anything is written. */
async function prepareLeadDetails(categoryId: bigint | null, subcategoryId: bigint | null, details: { attributeId: number; value: AttributeInput }[]) {
  if (!details.length) return [];
  if (!categoryId) throw badRequest("Pick a service before adding details");
  const allowed = await applicableAttributes(prisma, "lead", categoryId, subcategoryId);
  return details.flatMap((d) => {
    const attr = allowed.find((a) => a.id === BigInt(d.attributeId));
    if (!attr) throw badRequest("That detail does not apply to this service");
    const value = encodeAttributeValue(attr, d.value);
    return value === null ? [] : [{ attributeId: attr.id, value }];
  });
}

/**
 * A contact from a promoted category counts as a click and spends the cost per click from the budget.
 * The charge is stored on the lead so an accepted dispute can give it back.
 */
async function chargeSponsoredClick(leadId: bigint, providerId: bigint, categoryId: bigint) {
  const now = new Date();
  const listing = await prisma.sponsoredListing.findFirst({
    where: { providerId, categoryId, status: "active", startDate: { lte: now }, endDate: { gte: now } },
  });
  if (!listing) return;
  const cpc = await getNumberSetting("sponsored_cpc", 5);
  const spent = Math.min(Number(listing.budget), Number(listing.amountSpent) + cpc);
  const charge = spent - Number(listing.amountSpent);
  await prisma.$transaction([
    prisma.sponsoredListing.update({
      where: { id: listing.id },
      data: { clicks: { increment: 1 }, amountSpent: spent, ...(spent >= Number(listing.budget) ? { status: "completed" } : {}) },
    }),
    prisma.lead.update({ where: { id: leadId }, data: { sponsoredListingId: listing.id, sponsoredCharge: charge } }),
  ]);
}

/**
 * POST /leads — recorded when a visitor taps Call or WhatsApp. Guests are allowed so every contact
 * counts; the response carries the number to dial so the client never needs a second request.
 */
leadsRouter.post("/", limits.leads, optionalAuth, async (req, res) => {
  const body = parse(leadSchema, req.body);
  const provider = await prisma.provider.findFirst({
    where: { id: BigInt(body.providerId), status: "active" },
    select: { id: true, userId: true, businessName: true, phone: true, whatsappNumber: true },
  });
  if (!provider) throw notFound("Provider not found");
  const { plan, entitlements } = await planOf(provider.id);
  // WhatsApp contact is a paid feature; free listings only show Call.
  if (body.channel === "whatsapp" && !entitlements.includes("provider_pro")) throw badRequest("This business takes calls only");

  const [category, subcategory] = await Promise.all([
    body.categorySlug ? prisma.category.findUnique({ where: { slug: body.categorySlug }, select: { id: true } }) : null,
    body.subcategorySlug ? prisma.subcategory.findUnique({ where: { slug: body.subcategorySlug }, select: { id: true, categoryId: true } }) : null,
  ]);

  const categoryId = category?.id ?? subcategory?.categoryId ?? null;
  const details = await prepareLeadDetails(categoryId, subcategory?.id ?? null, body.details ?? []);

  const lead = await prisma.lead.create({
    data: {
      userId: req.user?.id ?? null,
      providerId: provider.id,
      channel: body.channel,
      source: body.source,
      description: body.description,
      categoryId,
      subcategoryId: subcategory?.id ?? null,
    },
  });

  if (details.length) {
    await prisma.attributeValue.createMany({ data: details.map((d) => ({ ...d, entityType: "lead" as const, entityId: lead.id })) });
  }

  if (categoryId) void chargeSponsoredClick(lead.id, provider.id, categoryId).catch(() => undefined);

  const overLimit = plan?.leadAccessLimit != null && (await leadsThisMonth(provider.id)) > plan.leadAccessLimit;
  void notify(
    provider.userId,
    "lead",
    body.channel === "call" ? "New call from DialNFind" : "New WhatsApp enquiry",
    overLimit
      ? `You have used the ${plan!.leadAccessLimit} leads in your ${plan!.name} plan this month. Upgrade to see who contacted you.`
      : "A customer just tapped to contact you from your DialNFind profile.",
    { leadId: Number(lead.id), locked: overLimit },
  );

  const number = body.channel === "whatsapp" ? (provider.whatsappNumber ?? provider.phone) : provider.phone;
  res.status(201).json({ lead: { id: lead.id, channel: lead.channel, createdAt: lead.createdAt }, contact: { number } });
});

const responseSchema = z.object({ responded: z.boolean() });

/** PATCH /leads/:id/response — "Did they respond?" follow-up; feeds providers.response_signal. */
leadsRouter.patch("/:id/response", requireAuth, async (req, res) => {
  const { responded } = parse(responseSchema, req.body);
  const lead = await prisma.lead.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!lead) throw notFound("Lead not found");
  if (lead.userId !== currentUser(req).id) throw forbidden();
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { customerReportedResponse: responded, customerReportedResponseAt: new Date() },
  });
  void recalculateProvider(lead.providerId);
  res.json({ lead: updated });
});
