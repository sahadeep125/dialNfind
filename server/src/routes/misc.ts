import { Router } from "express";
import { z } from "zod";
import { email, optionalPhone } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
import { supportStaffIds, ticketRef } from "../services/tickets.js";
import { sendTicketReceived } from "../services/emails.js";
import { getNumberSetting, SETTING_FIELDS } from "../services/settings.js";
import { limits } from "../lib/rate-limit.js";

export const miscRouter = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  phone: optionalPhone,
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(3000),
});

const CONTACT_TOPICS: Record<string, string> = {
  "Problem with a provider": "report",
  "Listing my business": "listing",
  "Report wrong information": "report",
};

/** The public contact form opens a support ticket so the team answers it from the help desk. */
miscRouter.post("/contact", limits.contact, optionalAuth, async (req, res) => {
  const body = parse(contactSchema, req.body);
  const provider = req.user ? await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } }) : null;
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user?.id ?? null,
      providerId: provider?.id ?? null,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      subject: body.subject || "Message from the contact form",
      category: CONTACT_TOPICS[body.subject ?? ""] ?? "general",
      source: "contact_form",
      messages: { create: { authorId: req.user?.id ?? null, body: body.message, attachments: [] } },
    },
  });
  for (const id of await supportStaffIds(null)) void notify(id, "support", `New ticket ${ticketRef(ticket.id)}`, ticket.subject, { ticketId: Number(ticket.id) });
  void sendTicketReceived(ticket.email, ticket.name, ticketRef(ticket.id), ticket.subject, !!req.user);
  res.status(201).json({ ok: true, id: ticket.id, reference: ticketRef(ticket.id) });
});

const PUBLIC_SETTINGS = ["site_name", "support_email", "support_phone", "support_hours", "terms_url", "privacy_url"] as const;

/** GET /app-config — public settings the apps show (support contacts, legal links), edited from the admin console. */
miscRouter.get("/app-config", async (_req, res) => {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...PUBLIC_SETTINGS] } } });
  const values = new Map(rows.map((r) => [r.key, r.value]));
  res.json({
    config: {
      ...Object.fromEntries(PUBLIC_SETTINGS.map((k) => [k, values.get(k) ?? SETTING_FIELDS.get(k)?.default ?? null])),
      min_review_length: await getNumberSetting("min_review_length", 10),
    },
  });
});

miscRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
    include: { badge: true },
  });
  res.json({ plans });
});

miscRouter.get("/stats", async (_req, res) => {
  const [providers, categories, cities, reviews] = await Promise.all([
    prisma.provider.count({ where: { status: "active" } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.provider.groupBy({ by: ["city"], where: { status: "active" } }),
    prisma.review.count({ where: { status: "published" } }),
  ]);
  res.json({ providers, categories, cities: cities.length, reviews });
});

miscRouter.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});
