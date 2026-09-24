import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { forbidden, notFound } from "../lib/errors.js";
import { currentUser, optionalAuth, requireAuth } from "../middleware/auth.js";
import { recalculateProvider } from "../services/ranking.js";

export const leadsRouter = Router();

const leadSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  channel: z.enum(["call", "whatsapp"]),
  source: z.enum(["search", "ai_match", "category_browse", "profile"]).default("profile"),
  categorySlug: z.string().optional(),
  subcategorySlug: z.string().optional(),
  description: z.string().trim().max(500).optional(),
});

/**
 * POST /leads — recorded when a visitor taps Call or WhatsApp. Guests are allowed so every contact
 * counts; the response carries the number to dial so the client never needs a second request.
 */
leadsRouter.post("/", optionalAuth, async (req, res) => {
  const body = parse(leadSchema, req.body);
  const provider = await prisma.provider.findFirst({
    where: { id: BigInt(body.providerId), status: "active" },
    select: { id: true, userId: true, businessName: true, phone: true, whatsappNumber: true },
  });
  if (!provider) throw notFound("Provider not found");

  const [category, subcategory] = await Promise.all([
    body.categorySlug ? prisma.category.findUnique({ where: { slug: body.categorySlug }, select: { id: true } }) : null,
    body.subcategorySlug ? prisma.subcategory.findUnique({ where: { slug: body.subcategorySlug }, select: { id: true, categoryId: true } }) : null,
  ]);

  const lead = await prisma.lead.create({
    data: {
      userId: req.user?.id ?? null,
      providerId: provider.id,
      channel: body.channel,
      source: body.source,
      description: body.description,
      categoryId: category?.id ?? subcategory?.categoryId ?? null,
      subcategoryId: subcategory?.id ?? null,
    },
  });

  if (provider.userId) {
    void prisma.notification
      .create({
        data: {
          userId: provider.userId,
          type: "lead",
          title: body.channel === "call" ? "New call from DialNFind" : "New WhatsApp enquiry",
          body: "A customer just tapped to contact you from your DialNFind profile.",
          dataJson: { leadId: Number(lead.id) },
        },
      })
      .catch(() => undefined);
  }

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
