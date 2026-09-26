import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notConfigured, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { num } from "../../lib/serialize.js";
import { completenessChecklist } from "../../services/ranking.js";
import { displayAttributeValue, loadAttributeValues } from "../../services/attributes.js";
import { notify } from "../../services/notify.js";
import { ownProvider } from "./common.js";
import { currentUser } from "../../middleware/auth.js";
import { getNumberSetting } from "../../services/settings.js";
import { openTicket } from "../../services/tickets.js";
import { limits } from "../../lib/rate-limit.js";
import { env } from "../../env.js";
import { stateCodeFor } from "../../lib/gst.js";
import { razorpay, razorpayConfigured, toPaise, verifyOrderSignature } from "../../services/razorpay.js";
import { activateSponsoredOrder } from "../../services/sponsored-orders.js";
import { assertFeature, getPlanState, hasEntitlement, lockedLeadIds, planOf } from "../../services/entitlements.js";

/** What a locked lead shows instead of the customer's details. */
const LOCKED = "Upgrade to see this contact";

export const insightsRouter = Router();

const rangeSchema = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

/** GET /provider/dashboard — headline numbers and a daily series for charts. */
insightsRouter.get("/dashboard", async (req, res) => {
  const provider = await ownProvider(req);
  const { days } = parse(rangeSchema, req.query);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const prevSince = new Date(since);
  prevSince.setUTCDate(prevSince.getUTCDate() - days);

  const [full, leadRows, statRows, prevLeads, prevViews, recentLeads, recentReviews, unreplied, plan, rankRows] = await Promise.all([
    prisma.provider.findUniqueOrThrow({
      where: { id: provider.id },
      include: { _count: { select: { businessHours: true, serviceAreas: true, services: true, portfolio: true, favorites: true } } },
    }),
    prisma.$queryRaw<{ day: Date; channel: string; count: bigint }[]>`
      SELECT date_trunc('day', created_at)::date AS day, channel::text AS channel, COUNT(*)::bigint AS count
      FROM leads WHERE provider_id = ${provider.id} AND created_at >= ${since} AND dispute_status <> 'accepted'
      GROUP BY 1, 2`,
    prisma.providerDailyStat.findMany({ where: { providerId: provider.id, date: { gte: since } } }),
    prisma.lead.count({ where: { providerId: provider.id, createdAt: { gte: prevSince, lt: since }, disputeStatus: { not: "accepted" } } }),
    prisma.providerDailyStat.aggregate({
      where: { providerId: provider.id, date: { gte: prevSince, lt: since } },
      _sum: { profileViews: true },
    }),
    prisma.lead.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, phone: true } }, subcategory: { select: { name: true } }, category: { select: { name: true } } },
    }),
    prisma.review.findMany({
      where: { providerId: provider.id, status: "published" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { user: { select: { name: true } } },
    }),
    prisma.review.count({ where: { providerId: provider.id, status: "published", providerReply: null } }),
    getPlanState(provider.id),
    prisma.$queryRaw<{ rank: bigint; total: bigint }[]>`
      WITH mine AS (
        SELECT ps.category_id FROM provider_services ps WHERE ps.provider_id = ${provider.id} ORDER BY ps.is_primary DESC LIMIT 1
      ), peers AS (
        SELECT DISTINCT p.id, p.ranking_score FROM providers p
        JOIN provider_services ps ON ps.provider_id = p.id
        WHERE ps.category_id = (SELECT category_id FROM mine) AND p.city = ${provider.city} AND p.status = 'active'
      )
      SELECT (SELECT COUNT(*) FROM peers WHERE ranking_score > ${provider.rankingScore}) + 1 AS rank, (SELECT COUNT(*) FROM peers) AS total`,
  ]);

  const series: { date: string; calls: number; whatsapp: number; views: number; impressions: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const leadsFor = (channel: string) =>
      Number(leadRows.find((r) => r.day.toISOString().slice(0, 10) === key && r.channel === channel)?.count ?? 0);
    const stat = statRows.find((s) => s.date.toISOString().slice(0, 10) === key);
    series.push({ date: key, calls: leadsFor("call"), whatsapp: leadsFor("whatsapp"), views: stat?.profileViews ?? 0, impressions: stat?.searchImpressions ?? 0 });
  }
  const sum = (k: "calls" | "whatsapp" | "views" | "impressions") => series.reduce((a, s) => a + s[k], 0);
  const leads = sum("calls") + sum("whatsapp");
  const views = sum("views");
  // Free plans see their lead count; views, trends, conversion and ranking are analytics (Pro).
  const analytics = hasEntitlement(plan, "provider_pro");
  const lockedRecent = await lockedLeadIds(provider.id, plan.limits.leads.limit, recentLeads.map((l) => l.id));

  res.json({
    provider: {
      id: full.id,
      slug: full.slug,
      businessName: full.businessName,
      status: full.status,
      isAvailable: full.isAvailable,
      avgRating: num(full.avgRating),
      totalReviews: full.totalReviews,
      verificationStatus: full.verificationStatus,
      profileCompletenessPct: full.profileCompletenessPct,
      rankingScore: num(full.rankingScore),
      responseSignal: num(full.responseSignal),
      favorites: full._count.favorites,
      city: full.city,
    },
    analyticsLocked: !analytics,
    totals: {
      leads,
      calls: sum("calls"),
      whatsapp: sum("whatsapp"),
      views: analytics ? views : null,
      impressions: analytics ? sum("impressions") : null,
      leadsChangePct: analytics && prevLeads ? Math.round(((leads - prevLeads) / prevLeads) * 100) : null,
      viewsChangePct: analytics && prevViews._sum.profileViews ? Math.round(((views - prevViews._sum.profileViews) / prevViews._sum.profileViews) * 100) : null,
      conversionPct: analytics && views ? Math.round((leads / views) * 1000) / 10 : null,
      unrepliedReviews: unreplied,
    },
    ranking: analytics ? { position: Number(rankRows[0]?.rank ?? 1), outOf: Number(rankRows[0]?.total ?? 1) } : null,
    series: analytics ? series : series.map((s) => ({ ...s, views: 0, impressions: 0 })),
    checklist: completenessChecklist(full),
    recentLeads: recentLeads.map((l) => {
      const locked = lockedRecent.has(l.id);
      return {
        id: l.id,
        channel: l.channel,
        createdAt: l.createdAt,
        locked,
        customerName: locked ? LOCKED : (l.user?.name ?? "Guest visitor"),
        customerPhone: locked ? null : (l.user?.phone ?? null),
        service: l.subcategory?.name ?? l.category?.name ?? null,
        description: locked ? null : l.description,
      };
    }),
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      providerReply: r.providerReply,
      createdAt: r.createdAt,
      author: r.user.name,
    })),
    plan,
    subscription: plan.subscription
      ? { planName: plan.plan.name, status: plan.subscription.status, endDate: plan.subscription.endDate, autoRenew: !plan.subscription.cancelAtPeriodEnd }
      : null,
  });
});

// Leads ------------------------------------------------------------------------------------

const LEAD_STATUSES = ["new", "contacted", "won", "lost"] as const;

const leadFilters = z.object({
  channel: z.enum(["call", "whatsapp"]).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
});
const leadsQuery = paginationSchema.merge(leadFilters);

function leadWhere(providerId: bigint, f: z.infer<typeof leadFilters>): Prisma.LeadWhereInput {
  const to = f.to ? new Date(f.to) : null;
  // "to" is a date: include the whole day.
  if (to) to.setUTCHours(23, 59, 59, 999);
  const text = f.q ? { contains: f.q, mode: "insensitive" as const } : null;
  return {
    providerId,
    ...(f.channel ? { channel: f.channel } : {}),
    ...(f.status ? { providerStatus: f.status } : {}),
    ...(f.from || to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(text
      ? { OR: [{ user: { name: text } }, { description: text }, { category: { name: text } }, { subcategory: { name: text } }] }
      : {}),
  };
}

const leadInclude = {
  user: { select: { name: true, phone: true } },
  category: { select: { name: true } },
  subcategory: { select: { name: true } },
  review: { select: { rating: true } },
} as const;

type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

function presentLead(l: LeadRow, hidden: boolean, details: { label: string; value: string }[]) {
  return {
    id: l.id,
    channel: l.channel,
    source: l.source,
    locked: hidden,
    description: hidden ? null : l.description,
    createdAt: l.createdAt,
    customerName: hidden ? LOCKED : (l.user?.name ?? "Guest visitor"),
    // Only signed-in customers have a number on file; hidden until the provider can see the lead.
    customerPhone: hidden ? null : (l.user?.phone ?? null),
    isGuest: !l.user,
    service: l.subcategory?.name ?? l.category?.name ?? null,
    customerReportedResponse: l.customerReportedResponse,
    reviewRating: l.review?.rating ?? null,
    disputeStatus: l.disputeStatus,
    disputeReason: l.disputeReason,
    providerStatus: l.providerStatus,
    providerNote: l.providerNote,
    details: hidden ? [] : details,
  };
}

async function presentLeads(providerId: bigint, leads: LeadRow[]) {
  const [values, { plan }] = await Promise.all([loadAttributeValues(prisma, "lead", leads.map((l) => l.id)), planOf(providerId)]);
  // Past the plan's monthly lead limit, a lead is still delivered but its details stay hidden until the provider upgrades.
  const locked = await lockedLeadIds(providerId, plan?.leadAccessLimit ?? null, leads.map((l) => l.id));
  const rows = leads.map((l) =>
    presentLead(
      l,
      locked.has(l.id),
      (values.get(l.id) ?? []).map((v) => ({ label: v.attribute.label, value: displayAttributeValue(v.attribute, v.value) })),
    ),
  );
  return { rows, leadLimit: plan?.leadAccessLimit ?? null };
}

insightsRouter.get("/leads", async (req, res) => {
  const provider = await ownProvider(req);
  const q = parse(leadsQuery, req.query);
  const where = leadWhere(provider.id, q);
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: leadInclude }),
    prisma.lead.count({ where }),
  ]);
  const { rows, leadLimit } = await presentLeads(provider.id, leads);
  res.json({ leads: rows, leadLimit, ...pageMeta(q.page, q.pageSize, total) });
});

const EXPORT_LIMIT = 5000;
const csvCell = (v: unknown) => {
  const t = v === null || v === undefined ? "" : String(v);
  // Quote every cell and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** GET /provider/leads/export.csv — the filtered leads (newest first, up to 5,000) as a spreadsheet. */
insightsRouter.get("/leads/export.csv", limits.exports, async (req, res) => {
  const provider = await ownProvider(req);
  const f = parse(leadFilters, req.query);
  const leads = await prisma.lead.findMany({ where: leadWhere(provider.id, f), orderBy: { createdAt: "desc" }, take: EXPORT_LIMIT, include: leadInclude });
  const { rows } = await presentLeads(provider.id, leads);
  const header = ["Date", "Channel", "Customer", "Phone", "Service", "Came from", "Status", "Note", "Customer said", "Rating", "Details", "Message"];
  const lines = rows.map((l) =>
    [
      l.createdAt.toISOString(),
      l.channel === "call" ? "Call" : "WhatsApp",
      l.customerName,
      l.customerPhone,
      l.service,
      l.source,
      l.providerStatus,
      l.providerNote,
      l.customerReportedResponse === null ? "" : l.customerReportedResponse ? "Responded" : "No response",
      l.reviewRating,
      l.details.map((d) => `${d.label}: ${d.value}`).join("; "),
      l.description,
    ]
      .map(csvCell)
      .join(","),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dialnfind-leads-${stamp}.csv"`, "Cache-Control": "private, no-store" });
  // BOM so Excel opens it as UTF-8.
  res.send("\ufeff" + [header.map(csvCell).join(","), ...lines].join("\r\n"));
});

const leadUpdateSchema = z
  .object({ status: z.enum(LEAD_STATUSES).optional(), note: z.string().trim().max(1000).nullable().optional() })
  .refine((b) => b.status !== undefined || b.note !== undefined, "Nothing to update");

/** PATCH /provider/leads/:id — the provider's own follow-up: status and a private note. */
insightsRouter.patch("/leads/:id", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(leadUpdateSchema, req.body);
  const lead = await prisma.lead.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!lead || lead.providerId !== provider.id) throw notFound("Lead not found");
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ...(body.status ? { providerStatus: body.status } : {}),
      ...(body.note !== undefined ? { providerNote: body.note || null } : {}),
      providerUpdatedAt: new Date(),
    },
  });
  res.json({ lead: { id: updated.id, providerStatus: updated.providerStatus, providerNote: updated.providerNote } });
});

const DISPUTE_WINDOW_DAYS = 30;
const disputeSchema = z.object({ reason: z.string().trim().min(10, "Tell us what was wrong with this contact, at least 10 characters").max(500) });

/**
 * POST /provider/leads/:id/dispute — report a contact as spam, fake or a wrong number. The team
 * reviews it; if accepted it no longer counts in the provider's numbers and any promotion charge is refunded.
 */
insightsRouter.post("/leads/:id/dispute", limits.disputes, async (req, res) => {
  const provider = await ownProvider(req);
  const { reason } = parse(disputeSchema, req.body);
  const lead = await prisma.lead.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!lead || lead.providerId !== provider.id) throw notFound("Lead not found");
  if (lead.disputeStatus !== "none") throw conflict("You already reported this contact");
  if (Date.now() - lead.createdAt.getTime() > DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000) throw badRequest(`Contacts can be reported within ${DISPUTE_WINDOW_DAYS} days`);
  const updated = await prisma.lead.update({ where: { id: lead.id }, data: { disputeStatus: "open", disputeReason: reason, disputedAt: new Date() } });
  res.status(201).json({ lead: { id: updated.id, disputeStatus: updated.disputeStatus, disputeReason: updated.disputeReason } });
});

// Reviews ----------------------------------------------------------------------------------

const reviewsQuery = paginationSchema.extend({ filter: z.enum(["all", "unreplied"]).default("all") });

insightsRouter.get("/reviews", async (req, res) => {
  const provider = await ownProvider(req);
  const q = parse(reviewsQuery, req.query);
  const where = {
    providerId: provider.id,
    status: { not: "removed" as const },
    ...(q.filter === "unreplied" ? { providerReply: null } : {}),
  };
  const [reviews, total, breakdown] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { name: true } }, photos: true },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ["rating"], where: { providerId: provider.id, status: "published" }, _count: true }),
  ]);
  const flags = await prisma.reportFlag.findMany({
    where: { targetType: "review", targetId: { in: reviews.map((r) => r.id) }, reporterUserId: currentUser(req).id },
    select: { targetId: true },
  });
  const reported = new Set(flags.map((f) => f.targetId));
  res.json({
    summary: {
      avgRating: num(provider.avgRating),
      totalReviews: provider.totalReviews,
      breakdown: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: breakdown.find((b) => b.rating === rating)?._count ?? 0 })),
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      providerReply: r.providerReply,
      providerReplyAt: r.providerReplyAt,
      status: r.status,
      isVerifiedContact: r.leadId !== null,
      createdAt: r.createdAt,
      author: r.user.name,
      photos: r.photos.map((p) => p.photoUrl),
      reported: reported.has(r.id),
    })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

const replySchema = z.object({ reply: z.string().trim().min(2).max(1000).nullable() });

/** Providers may only reply; they cannot edit or remove the review itself. */
insightsRouter.put("/reviews/:id/reply", async (req, res) => {
  const provider = await ownProvider(req);
  const { reply } = parse(replySchema, req.body);
  const id = idParam(req.params.id as string);
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.providerId !== provider.id) throw notFound("Review not found");
  const updated = await prisma.review.update({
    where: { id },
    data: { providerReply: reply, providerReplyAt: reply ? new Date() : null },
  });
  if (reply && !review.providerReply) {
    void notify(review.userId, "review_reply", `${provider.businessName} replied to your review`, reply.slice(0, 120), { providerSlug: provider.slug, reviewId: Number(id) });
  }
  res.json({ review: updated });
});

const reviewReportSchema = z.object({ reason: z.string().trim().min(10, "Tell us what is wrong with this review, at least 10 characters").max(500) });

/** POST /provider/reviews/:id/report — flags a fake or abusive review for the moderation team. */
insightsRouter.post("/reviews/:id/report", limits.reviews, async (req, res) => {
  const provider = await ownProvider(req);
  const { reason } = parse(reviewReportSchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) }, select: { id: true, providerId: true } });
  if (!review || review.providerId !== provider.id) throw notFound("Review not found");
  const reporterUserId = currentUser(req).id;
  const open = await prisma.reportFlag.findFirst({ where: { targetType: "review", targetId: review.id, reporterUserId, status: "open" } });
  if (open) throw conflict("You already reported this review. Our team is looking at it.");
  await prisma.reportFlag.create({ data: { reporterUserId, targetType: "review", targetId: review.id, reason } });
  res.status(201).json({ ok: true });
});

// Sponsored listings ---------------------------------------------------------------------------

async function sponsoredPricing() {
  const [costPerClick, minBudget] = await Promise.all([getNumberSetting("sponsored_cpc", 5), getNumberSetting("sponsored_min_budget", 500)]);
  return { costPerClick, minBudget };
}

insightsRouter.get("/sponsored", async (req, res) => {
  const provider = await ownProvider(req);
  const [listings, services, pricing] = await Promise.all([
    prisma.sponsoredListing.findMany({
      where: { providerId: provider.id },
      orderBy: { startDate: "desc" },
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.providerService.findMany({ where: { providerId: provider.id }, distinct: ["categoryId"], include: { category: { select: { id: true, name: true } } } }),
    sponsoredPricing(),
  ]);
  const { entitlements } = await planOf(provider.id);
  res.json({
    locked: !entitlements.includes("provider_business"),
    listings: listings.map((l) => ({
      ...l,
      budget: num(l.budget),
      amountSpent: num(l.amountSpent),
      ctrPct: l.impressions ? Math.round((l.clicks / l.impressions) * 1000) / 10 : null,
    })),
    categories: services.map((s) => s.category),
    pricing: { ...pricing, city: provider.city, gstRate: await getNumberSetting("invoice_gst_rate", 18) },
    // Online payment starts the campaign straight away; otherwise the provider sends a request to the team.
    checkoutEnabled: razorpayConfigured(),
  });
});

const sponsorSchema = z.object({
  categoryId: z.number().int().positive(),
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  budget: z.number().int().positive().max(1_000_000),
  note: z.string().trim().max(1000).optional(),
});

/** The checks every new campaign passes, online or by request. Returns the category being promoted. */
async function assertCanPromote(provider: { id: bigint; status: string }, body: { categoryId: number; budget: number }) {
  await assertFeature(provider.id, "promote");
  if (provider.status !== "active") throw badRequest("Your listing must be live before you can promote it");
  const { minBudget } = await sponsoredPricing();
  if (body.budget < minBudget) throw badRequest(`The minimum budget is Rs ${minBudget}`);
  const service = await prisma.providerService.findFirst({ where: { providerId: provider.id, categoryId: BigInt(body.categoryId) }, include: { category: { select: { name: true } } } });
  if (!service) throw badRequest("You can only promote a category you offer");
  const running = await prisma.sponsoredListing.count({
    where: { providerId: provider.id, categoryId: BigInt(body.categoryId), status: { in: ["active", "paused"] }, endDate: { gte: new Date() } },
  });
  if (running) throw conflict("You already have a campaign running in this category");
  return service.category;
}

/** POST /provider/sponsored/request — asks the team to set up a campaign; it is created from the admin console once paid. */
insightsRouter.post("/sponsored/request", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(sponsorSchema, req.body);
  const category = await assertCanPromote(provider, body);
  const ticket = await openTicket(currentUser(req).id, {
    subject: `Promotion request: ${category.name}`,
    category: "billing",
    message: [
      `${provider.businessName} (${provider.city}) would like to promote their listing in ${category.name}.`,
      `Duration: ${body.days} days. Budget: Rs ${body.budget}.`,
      body.note ? `Note from the provider: ${body.note}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });
  res.status(201).json({ ticket: { id: ticket.id, reference: ticket.reference } });
});

/**
 * POST /provider/sponsored/checkout — pay for a campaign online. Creates a Razorpay order for the budget
 * plus GST; the campaign starts as soon as the payment is confirmed (Checkout handler or webhook).
 */
insightsRouter.post("/sponsored/checkout", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(sponsorSchema, req.body);
  if (!razorpayConfigured()) throw notConfigured("Online payments are not set up yet. Send a request and our team will help.");
  const category = await assertCanPromote(provider, body);
  if (!(provider.billingStateCode ?? stateCodeFor(provider.state))) throw badRequest("Add your billing details first");
  const rate = await getNumberSetting("invoice_gst_rate", 18);
  const amount = Math.round(body.budget * (1 + rate / 100) * 100) / 100;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: { name: true, email: true, phone: true } });
  const rzp = await razorpay.createOrder({
    amountPaise: toPaise(amount),
    receipt: `promo-${provider.id}-${Date.now()}`,
    notes: { providerId: String(provider.id), categoryId: String(body.categoryId), days: String(body.days), kind: "sponsored" },
  });
  await prisma.sponsoredOrder.create({
    data: { providerId: provider.id, categoryId: BigInt(body.categoryId), days: body.days, budget: body.budget, amount, razorpayOrderId: rzp.id },
  });
  res.status(201).json({
    orderId: rzp.id,
    keyId: env.razorpay.keyId,
    name: "DialNFind",
    description: `Sponsored in ${category.name}, ${body.days} days`,
    amount,
    currency: "INR",
    prefill: { name: user.name, email: user.email, contact: user.phone ?? undefined },
  });
});

const orderVerifySchema = z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() });

/** POST /provider/sponsored/verify — Checkout success. Starts the campaign without waiting for the webhook. */
insightsRouter.post("/sponsored/verify", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(orderVerifySchema, req.body);
  if (!verifyOrderSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    throw badRequest("We could not confirm this payment. If you were charged, your campaign starts within a few minutes.");
  }
  const order = await prisma.sponsoredOrder.findUnique({ where: { razorpayOrderId: body.razorpay_order_id } });
  if (!order || order.providerId !== provider.id) throw notFound("Order not found");
  const done = await activateSponsoredOrder(order, body.razorpay_payment_id);
  res.json({ campaignId: done.sponsoredListingId });
});

insightsRouter.patch("/sponsored/:id", async (req, res) => {
  const provider = await ownProvider(req);
  const { status } = parse(z.object({ status: z.enum(["active", "paused"]) }), req.body);
  const id = idParam(req.params.id as string);
  const listing = await prisma.sponsoredListing.findUnique({ where: { id } });
  if (!listing || listing.providerId !== provider.id) throw notFound("Campaign not found");
  if (listing.status === "completed") throw badRequest("This campaign has ended");
  if (status === "active") await assertFeature(provider.id, "promote");
  const updated = await prisma.sponsoredListing.update({ where: { id }, data: { status } });
  res.json({ listing: updated });
});
