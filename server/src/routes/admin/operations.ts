import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { pageMeta, paginationSchema } from "../../lib/pagination.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { notify } from "../../services/notify.js";

/** Dashboard, analytics, leads, reviews, provider detail, subscriptions and announcements. */
export const adminOpsRouter = Router();

const DAY = 864e5;
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Daily counts for the last `days` days, zero-filled, from a table with a created_at column. */
async function dailySeries(table: "users" | "providers" | "leads" | "reviews" | "support_tickets", since: Date, days: number) {
  const rows = await prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
    `SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count FROM ${table} WHERE created_at >= $1 GROUP BY 1`,
    since,
  );
  const map = new Map(rows.map((r) => [startOfDay(new Date(r.day)).toISOString().slice(0, 10), Number(r.count)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    return { date: d, value: map.get(d) ?? 0 };
  });
}

async function revenueSeries(since: Date, days: number) {
  const rows = await prisma.$queryRaw<{ day: Date; amount: number }[]>`
    SELECT date_trunc('day', created_at) AS day, SUM(amount)::float AS amount FROM transactions
    WHERE created_at >= ${since} AND status = 'success' GROUP BY 1`;
  const map = new Map(rows.map((r) => [startOfDay(new Date(r.day)).toISOString().slice(0, 10), r.amount]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    return { date: d, value: map.get(d) ?? 0 };
  });
}

adminOpsRouter.get("/overview", async (_req, res) => {
  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = startOfDay(new Date(Date.now() - 13 * DAY));
  const [providers, activeProviders, pendingProviders, pendingClaims, pendingVerifications, openFlags, users, customers, leads30, reviews30, revenue30, activeSponsored, openTickets, activeSubs] =
    await Promise.all([
      prisma.provider.count(),
      prisma.provider.count({ where: { status: "active" } }),
      prisma.provider.count({ where: { status: "pending" } }),
      prisma.providerClaim.count({ where: { status: "pending" } }),
      prisma.verification.count({ where: { status: "pending" } }),
      prisma.reportFlag.count({ where: { status: "open" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.lead.count({ where: { createdAt: { gte: since30 } } }),
      prisma.review.count({ where: { createdAt: { gte: since30 } } }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: since30 }, status: "success" }, _sum: { amount: true } }),
      prisma.sponsoredListing.count({ where: { status: "active" } }),
      prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }),
      prisma.providerSubscription.count({ where: { status: "active" } }),
    ]);
  const [leadSeries, signupSeries] = await Promise.all([dailySeries("leads", since14, 14), dailySeries("users", since14, 14)]);
  res.json({
    providers,
    activeProviders,
    pendingProviders,
    pendingClaims,
    pendingVerifications,
    openFlags,
    users,
    customers,
    leads30,
    reviews30,
    revenue30: revenue30._sum.amount ?? 0,
    activeSponsored,
    openTickets,
    activeSubscriptions: activeSubs,
    leadSeries,
    signupSeries,
  });
});

adminOpsRouter.get("/analytics", async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30) }), req.query);
  const since = startOfDay(new Date(Date.now() - (days - 1) * DAY));
  const [signups, providers, leads, reviews, tickets, revenue, byChannel, topCategories, topCities, topProviders] = await Promise.all([
    dailySeries("users", since, days),
    dailySeries("providers", since, days),
    dailySeries("leads", since, days),
    dailySeries("reviews", since, days),
    dailySeries("support_tickets", since, days),
    revenueSeries(since, days),
    prisma.lead.groupBy({ by: ["channel"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT c.name, COUNT(*)::bigint AS count FROM leads l JOIN categories c ON c.id = l.category_id
      WHERE l.created_at >= ${since} GROUP BY c.name ORDER BY count DESC LIMIT 8`,
    prisma.$queryRaw<{ city: string; count: bigint }[]>`
      SELECT p.city, COUNT(*)::bigint AS count FROM leads l JOIN providers p ON p.id = l.provider_id
      WHERE l.created_at >= ${since} GROUP BY p.city ORDER BY count DESC LIMIT 8`,
    prisma.$queryRaw<{ id: bigint; business_name: string; city: string; count: bigint }[]>`
      SELECT p.id, p.business_name, p.city, COUNT(*)::bigint AS count FROM leads l JOIN providers p ON p.id = l.provider_id
      WHERE l.created_at >= ${since} GROUP BY p.id ORDER BY count DESC LIMIT 10`,
  ]);
  const sum = (s: { value: number }[]) => s.reduce((a, b) => a + b.value, 0);
  res.json({
    days,
    totals: { signups: sum(signups), providers: sum(providers), leads: sum(leads), reviews: sum(reviews), tickets: sum(tickets), revenue: sum(revenue) },
    series: { signups, providers, leads, reviews, tickets, revenue },
    leadsByChannel: byChannel.map((c) => ({ channel: c.channel, count: c._count })),
    topCategories: topCategories.map((r) => ({ name: r.name, count: Number(r.count) })),
    topCities: topCities.map((r) => ({ city: r.city, count: Number(r.count) })),
    topProviders: topProviders.map((r) => ({ id: Number(r.id), businessName: r.business_name, city: r.city, leads: Number(r.count) })),
  });
});

// Leads ------------------------------------------------------------------------------------------

adminOpsRouter.get("/leads", async (req, res) => {
  const q = parse(
    paginationSchema.extend({
      channel: z.enum(["call", "whatsapp"]).optional(),
      providerId: z.coerce.number().int().positive().optional(),
      days: z.coerce.number().int().min(1).max(365).optional(),
    }),
    req.query,
  );
  const where: Prisma.LeadWhereInput = {
    ...(q.channel ? { channel: q.channel } : {}),
    ...(q.providerId ? { providerId: BigInt(q.providerId) } : {}),
    ...(q.days ? { createdAt: { gte: new Date(Date.now() - q.days * DAY) } } : {}),
  };
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, businessName: true, city: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);
  res.json({ leads, ...pageMeta(q.page, q.pageSize, total) });
});

// Reviews ----------------------------------------------------------------------------------------

adminOpsRouter.get("/reviews", async (req, res) => {
  const q = parse(
    paginationSchema.extend({
      status: z.enum(["published", "flagged", "removed"]).optional(),
      rating: z.coerce.number().int().min(1).max(5).optional(),
      q: z.string().trim().max(100).optional(),
    }),
    req.query,
  );
  const where: Prisma.ReviewWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q ? { OR: [{ reviewText: { contains: q.q, mode: "insensitive" } }, { provider: { businessName: { contains: q.q, mode: "insensitive" } } }] } : {}),
  };
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, businessName: true, slug: true } },
        photos: { select: { photoUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  const flags = await prisma.reportFlag.groupBy({ by: ["targetId"], where: { targetType: "review", status: "open", targetId: { in: reviews.map((r) => r.id) } }, _count: true });
  const flagMap = new Map(flags.map((f) => [f.targetId.toString(), f._count]));
  res.json({
    reviews: reviews.map((r) => ({ ...r, photos: r.photos.map((p) => p.photoUrl), openReports: flagMap.get(r.id.toString()) ?? 0 })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

// Provider detail ----------------------------------------------------------------------------------

adminOpsRouter.get("/providers/:id", async (req, res) => {
  const id = idParam(req.params.id as string);
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true } },
      services: { include: { category: { select: { name: true } }, subcategory: { select: { name: true } } } },
      verifications: { orderBy: { createdAt: "desc" } },
      badges: { include: { badge: true } },
      subscriptions: { orderBy: { startDate: "desc" }, take: 5, include: { plan: { select: { id: true, name: true, price: true } } } },
      sponsoredListings: { orderBy: { startDate: "desc" }, take: 5, include: { category: { select: { name: true } } } },
      claims: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true, email: true } } } },
      portfolio: { take: 6 },
      businessHours: true,
      serviceAreas: true,
    },
  });
  if (!provider) throw notFound("Provider not found");
  const since30 = new Date(Date.now() - 30 * DAY);
  const [leads30, leadsAll, openTickets, recentReviews] = await Promise.all([
    prisma.lead.count({ where: { providerId: id, createdAt: { gte: since30 } } }),
    prisma.lead.count({ where: { providerId: id } }),
    prisma.supportTicket.count({ where: { providerId: id, status: { in: ["open", "pending"] } } }),
    prisma.review.findMany({ where: { providerId: id }, orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
  ]);
  const { location: _location, ...rest } = provider as typeof provider & { location?: unknown };
  res.json({ provider: rest, stats: { leads30, leadsAll, openTickets }, recentReviews });
});

const subscriptionSchema = z.object({ planId: z.number().int().positive(), months: z.number().int().min(1).max(36), note: z.string().trim().max(200).optional() });

/** Gives a provider a plan without payment, e.g. a launch offer or a goodwill extension. */
adminOpsRouter.post("/providers/:id/subscription", async (req, res) => {
  const body = parse(subscriptionSchema, req.body);
  const providerId = idParam(req.params.id as string);
  const [provider, plan] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId }, select: { userId: true } }),
    prisma.subscriptionPlan.findUnique({ where: { id: BigInt(body.planId) } }),
  ]);
  if (!provider) throw notFound("Provider not found");
  if (!plan || !plan.isActive) throw badRequest("Choose an active plan");
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + body.months);
  const subscription = await prisma.$transaction(async (tx) => {
    await tx.providerSubscription.updateMany({ where: { providerId, status: "active" }, data: { status: "cancelled", endDate: start } });
    return tx.providerSubscription.create({ data: { providerId, planId: plan.id, startDate: start, endDate: end, status: "active", autoRenew: false } });
  });
  await logAdmin(currentUser(req).id, "subscription.grant", "provider", providerId, body);
  void notify(provider.userId, "subscription", `You are now on the ${plan.name} plan`, `Active until ${end.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`, { planId: body.planId });
  res.status(201).json({ subscription });
});

adminOpsRouter.get("/subscriptions", async (req, res) => {
  const q = parse(paginationSchema.extend({ status: z.enum(["active", "expired", "cancelled"]).optional(), planId: z.coerce.number().int().positive().optional() }), req.query);
  const where: Prisma.ProviderSubscriptionWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.planId ? { planId: BigInt(q.planId) } : {}) };
  const [subscriptions, total] = await Promise.all([
    prisma.providerSubscription.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { plan: { select: { id: true, name: true, price: true, billingCycle: true } }, provider: { select: { id: true, businessName: true, city: true } } },
    }),
    prisma.providerSubscription.count({ where }),
  ]);
  res.json({ subscriptions, ...pageMeta(q.page, q.pageSize, total) });
});

adminOpsRouter.patch("/subscriptions/:id", async (req, res) => {
  const body = parse(z.object({ status: z.enum(["active", "expired", "cancelled"]).optional(), endDate: z.coerce.date().optional(), autoRenew: z.boolean().optional() }), req.body);
  const id = idParam(req.params.id as string);
  const subscription = await prisma.providerSubscription.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "subscription.update", "provider_subscription", id, body);
  res.json({ subscription });
});

// Categories (admin view includes inactive ones) ----------------------------------------------------

adminOpsRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      subcategories: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }], include: { _count: { select: { providerServices: true } } } },
      attributes: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      _count: { select: { providerServices: true, leads: true } },
    },
  });
  res.json({
    categories: categories.map((c) => ({
      ...c,
      attributes: c.attributes.map(({ optionsJson, ...a }) => ({ ...a, options: Array.isArray(optionsJson) ? optionsJson : [] })),
    })),
  });
});

// Announcements --------------------------------------------------------------------------------------

const broadcastSchema = z.object({
  audience: z.enum(["all", "providers", "customers", "unverified_providers"]),
  title: z.string().trim().min(3, "Write a title of at least 3 characters").max(80),
  body: z.string().trim().min(5, "Write a message of at least 5 characters").max(500),
  city: z.string().trim().max(60).optional(),
});

function audienceWhere(a: z.infer<typeof broadcastSchema>): Prisma.UserWhereInput {
  const city = a.city ? { provider: { city: { equals: a.city, mode: "insensitive" as const } } } : {};
  switch (a.audience) {
    case "providers":
      return { role: "provider", status: "active", ...city };
    case "unverified_providers":
      return { role: "provider", status: "active", provider: { verificationStatus: { not: "verified" }, ...(a.city ? { city: { equals: a.city, mode: "insensitive" as const } } : {}) } };
    case "customers":
      return { role: "customer", status: "active" };
    default:
      return { role: { in: ["customer", "provider"] }, status: "active" };
  }
}

adminOpsRouter.post("/notifications/preview", async (req, res) => {
  const body = parse(broadcastSchema.pick({ audience: true, city: true }).extend({ title: z.string().optional(), body: z.string().optional() }), req.body);
  res.json({ recipients: await prisma.user.count({ where: audienceWhere(body as z.infer<typeof broadcastSchema>) }) });
});

adminOpsRouter.post("/notifications/broadcast", async (req, res) => {
  const body = parse(broadcastSchema, req.body);
  const users = await prisma.user.findMany({ where: audienceWhere(body), select: { id: true } });
  if (!users.length) throw badRequest("No one matches this audience");
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: "system", title: body.title, body: body.body })) });
  await logAdmin(currentUser(req).id, "notification.broadcast", "notification", undefined, { ...body, recipients: users.length });
  res.status(201).json({ recipients: users.length });
});

adminOpsRouter.get("/notifications/broadcasts", async (_req, res) => {
  const logs = await prisma.adminActivityLog.findMany({
    where: { action: "notification.broadcast" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { admin: { select: { name: true } } },
  });
  res.json({ broadcasts: logs.map((l) => ({ id: l.id, createdAt: l.createdAt, sentBy: l.admin.name, ...(l.detailsJson as Record<string, unknown>) })) });
});
