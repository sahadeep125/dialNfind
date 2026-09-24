import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { num } from "../../lib/serialize.js";
import { env } from "../../env.js";
import { completenessChecklist, recalculateProvider } from "../../services/ranking.js";
import { displayAttributeValue, loadAttributeValues } from "../../services/attributes.js";
import { notify } from "../../services/notify.js";
import { ownProvider } from "./common.js";

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

  const [full, leadRows, statRows, prevLeads, prevViews, recentLeads, recentReviews, unreplied, subscription, rankRows] = await Promise.all([
    prisma.provider.findUniqueOrThrow({
      where: { id: provider.id },
      include: { _count: { select: { businessHours: true, serviceAreas: true, services: true, portfolio: true, favorites: true } } },
    }),
    prisma.$queryRaw<{ day: Date; channel: string; count: bigint }[]>`
      SELECT date_trunc('day', created_at)::date AS day, channel::text AS channel, COUNT(*)::bigint AS count
      FROM leads WHERE provider_id = ${provider.id} AND created_at >= ${since}
      GROUP BY 1, 2`,
    prisma.providerDailyStat.findMany({ where: { providerId: provider.id, date: { gte: since } } }),
    prisma.lead.count({ where: { providerId: provider.id, createdAt: { gte: prevSince, lt: since } } }),
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
    prisma.providerSubscription.findFirst({
      where: { providerId: provider.id, status: "active" },
      include: { plan: true },
      orderBy: { startDate: "desc" },
    }),
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
    totals: {
      leads,
      calls: sum("calls"),
      whatsapp: sum("whatsapp"),
      views,
      impressions: sum("impressions"),
      leadsChangePct: prevLeads ? Math.round(((leads - prevLeads) / prevLeads) * 100) : null,
      viewsChangePct: prevViews._sum.profileViews ? Math.round(((views - prevViews._sum.profileViews) / prevViews._sum.profileViews) * 100) : null,
      conversionPct: views ? Math.round((leads / views) * 1000) / 10 : null,
      unrepliedReviews: unreplied,
    },
    ranking: { position: Number(rankRows[0]?.rank ?? 1), outOf: Number(rankRows[0]?.total ?? 1) },
    series,
    checklist: completenessChecklist(full),
    recentLeads: recentLeads.map((l) => ({
      id: l.id,
      channel: l.channel,
      createdAt: l.createdAt,
      customerName: l.user?.name ?? "Guest visitor",
      service: l.subcategory?.name ?? l.category?.name ?? null,
      description: l.description,
    })),
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      providerReply: r.providerReply,
      createdAt: r.createdAt,
      author: r.user.name,
    })),
    subscription: subscription
      ? { planName: subscription.plan.name, status: subscription.status, endDate: subscription.endDate, autoRenew: subscription.autoRenew }
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
  const details = await loadAttributeValues(prisma, "lead", leads.map((l) => l.id));
  res.json({
    leads: leads.map((l) => ({
      id: l.id,
      channel: l.channel,
      source: l.source,
      description: l.description,
      createdAt: l.createdAt,
      customerName: l.user?.name ?? "Guest visitor",
      isGuest: !l.user,
      service: l.subcategory?.name ?? l.category?.name ?? null,
      customerReportedResponse: l.customerReportedResponse,
      reviewRating: l.review?.rating ?? null,
      details: (details.get(l.id) ?? []).map((v) => ({ label: v.attribute.label, value: displayAttributeValue(v.attribute, v.value) })),
    })),
    ...pageMeta(q.page, q.pageSize, total),
  });
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

// Subscription & billing ---------------------------------------------------------------------

insightsRouter.get("/subscription", async (req, res) => {
  const provider = await ownProvider(req);
  const [current, plans, transactions] = await Promise.all([
    prisma.providerSubscription.findFirst({
      where: { providerId: provider.id, status: "active" },
      include: { plan: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" }, include: { badge: true } }),
    prisma.transaction.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  res.json({ current, plans, transactions });
});

const checkoutSchema = z.object({ planId: z.number().int().positive() });

/**
 * POST /provider/subscription/checkout — payment gateway is not wired yet. Outside production the
 * charge is simulated as successful so the upgrade flow can be demoed end to end.
 */
insightsRouter.post("/subscription/checkout", async (req, res) => {
  const provider = await ownProvider(req);
  const { planId } = parse(checkoutSchema, req.body);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: BigInt(planId) } });
  if (!plan || !plan.isActive) throw notFound("Plan not found");
  if (!env.paymentGatewayKey && env.nodeEnv === "production") throw badRequest("Payments are not configured yet");

  const start = new Date();
  const end = new Date(start);
  if (plan.billingCycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  const result = await prisma.$transaction(async (tx) => {
    await tx.providerSubscription.updateMany({ where: { providerId: provider.id, status: "active" }, data: { status: "cancelled" } });
    const subscription = await tx.providerSubscription.create({
      data: { providerId: provider.id, planId: plan.id, startDate: start, endDate: num(plan.price) ? end : null, status: "active" },
      include: { plan: true },
    });
    const transaction = num(plan.price)
      ? await tx.transaction.create({
          data: {
            providerId: provider.id,
            type: "subscription",
            amount: plan.price,
            status: "success",
            gatewayTxnId: `sim_${Date.now().toString(36)}`,
          },
        })
      : null;
    if (plan.badgeId) {
      await tx.providerBadge.upsert({
        where: { providerId_badgeId: { providerId: provider.id, badgeId: plan.badgeId } },
        create: { providerId: provider.id, badgeId: plan.badgeId },
        update: {},
      });
    }
    return { subscription, transaction };
  });
  await recalculateProvider(provider.id);
  void notify(req.user?.id, "subscription", `You are on the ${plan.name} plan`, num(plan.price) ? `Active until ${end.toDateString()}.` : "Your listing stays free to find.", { planId });
  res.status(201).json({ ...result, simulated: !env.paymentGatewayKey });
});

insightsRouter.post("/subscription/cancel", async (req, res) => {
  const provider = await ownProvider(req);
  await prisma.providerSubscription.updateMany({
    where: { providerId: provider.id, status: "active" },
    data: { autoRenew: false },
  });
  res.json({ ok: true });
});

// Sponsored listings ---------------------------------------------------------------------------

async function sponsoredPricing() {
  const rows = await prisma.setting.findMany({ where: { key: { in: ["sponsored_cpc", "sponsored_min_budget"] } } });
  const get = (k: string, d: number) => Number(rows.find((r) => r.key === k)?.value ?? d) || d;
  return { costPerClick: get("sponsored_cpc", 5), minBudget: get("sponsored_min_budget", 500) };
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
  res.json({
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
});

/** POST /provider/sponsored — buys a campaign. Payment is simulated until a gateway is configured. */
insightsRouter.post("/sponsored", async (req, res) => {
  const provider = await ownProvider(req);
  const body = parse(sponsorSchema, req.body);
  if (provider.status !== "active") throw badRequest("Your listing must be live before you can promote it");
  const { minBudget } = await sponsoredPricing();
  if (body.budget < minBudget) throw badRequest(`The minimum budget is Rs ${minBudget}`);
  const offers = await prisma.providerService.count({ where: { providerId: provider.id, categoryId: BigInt(body.categoryId) } });
  if (!offers) throw badRequest("You can only promote a category you offer");
  if (!env.paymentGatewayKey && env.nodeEnv === "production") throw badRequest("Payments are not configured yet");
  const running = await prisma.sponsoredListing.count({
    where: { providerId: provider.id, categoryId: BigInt(body.categoryId), status: { in: ["active", "paused"] }, endDate: { gte: new Date() } },
  });
  if (running) throw conflict("You already have a campaign running in this category");

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + body.days - 1);
  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.sponsoredListing.create({
      data: { providerId: provider.id, categoryId: BigInt(body.categoryId), targetLocation: provider.city, startDate: start, endDate: end, budget: body.budget },
    });
    const transaction = await tx.transaction.create({
      data: { providerId: provider.id, type: "sponsored_ad", amount: body.budget, status: "success", gatewayTxnId: `sim_${Date.now().toString(36)}` },
    });
    return { listing, transaction };
  });
  res.status(201).json({ ...result, simulated: !env.paymentGatewayKey });
});

insightsRouter.patch("/sponsored/:id", async (req, res) => {
  const provider = await ownProvider(req);
  const { status } = parse(z.object({ status: z.enum(["active", "paused"]) }), req.body);
  const id = idParam(req.params.id as string);
  const listing = await prisma.sponsoredListing.findUnique({ where: { id } });
  if (!listing || listing.providerId !== provider.id) throw notFound("Campaign not found");
  if (listing.status === "completed") throw badRequest("This campaign has ended");
  const updated = await prisma.sponsoredListing.update({ where: { id }, data: { status } });
  res.json({ listing: updated });
});
