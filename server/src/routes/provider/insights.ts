import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
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
      include: { user: { select: { name: true } }, subcategory: { select: { name: true } }, category: { select: { name: true } } },
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

const leadsQuery = paginationSchema.extend({ channel: z.enum(["call", "whatsapp"]).optional() });

insightsRouter.get("/leads", async (req, res) => {
  const provider = await ownProvider(req);
  const q = parse(leadsQuery, req.query);
  const where = { providerId: provider.id, ...(q.channel ? { channel: q.channel } : {}) };
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        review: { select: { rating: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);
  const [details, { plan }] = await Promise.all([loadAttributeValues(prisma, "lead", leads.map((l) => l.id)), planOf(provider.id)]);
  // Past the plan's monthly lead limit, a lead is still delivered but its details stay hidden until the provider upgrades.
  const locked = await lockedLeadIds(provider.id, plan?.leadAccessLimit ?? null, leads.map((l) => l.id));
  res.json({
    leads: leads.map((l) => {
      const hidden = locked.has(l.id);
      return {
        id: l.id,
        channel: l.channel,
        source: l.source,
        locked: hidden,
        description: hidden ? null : l.description,
        createdAt: l.createdAt,
        customerName: hidden ? LOCKED : (l.user?.name ?? "Guest visitor"),
        isGuest: !l.user,
        service: l.subcategory?.name ?? l.category?.name ?? null,
        customerReportedResponse: l.customerReportedResponse,
        reviewRating: l.review?.rating ?? null,
        disputeStatus: l.disputeStatus,
        disputeReason: l.disputeReason,
        details: hidden ? [] : (details.get(l.id) ?? []).map((v) => ({ label: v.attribute.label, value: displayAttributeValue(v.attribute, v.value) })),
      };
    }),
    leadLimit: plan?.leadAccessLimit ?? null,
    ...pageMeta(q.page, q.pageSize, total),
  });
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
    pricing: { ...pricing, city: provider.city },
  });
});

const sponsorSchema = z.object({
  categoryId: z.number().int().positive(),
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  budget: z.number().int().positive().max(1_000_000),
  note: z.string().trim().max(1000).optional(),
});

/** POST /provider/sponsored/request — asks the team to set up a campaign; it is created from the admin console once paid. */
insightsRouter.post("/sponsored/request", limits.billing, async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(sponsorSchema, req.body);
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
  const ticket = await openTicket(currentUser(req).id, {
    subject: `Promotion request: ${service.category.name}`,
    category: "billing",
    message: [
      `${provider.businessName} (${provider.city}) would like to promote their listing in ${service.category.name}.`,
      `Duration: ${body.days} days. Budget: Rs ${body.budget}.`,
      body.note ? `Note from the provider: ${body.note}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });
  res.status(201).json({ ticket: { id: ticket.id, reference: ticket.reference } });
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
