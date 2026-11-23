import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { notifyAndEmail } from "../../services/notify.js";
import { env } from "../../env.js";
import { externalSubscriptionUrl, offlinePaymentSchema, recordPayment } from "./records.js";
import type { SubscriptionSource } from "@prisma/client";
import { applySubscriptionChange, getPlanState, liveSubscription } from "../../services/entitlements.js";
import { presentInvoice } from "../../services/invoices.js";
import { razorpay } from "../../services/razorpay.js";
import type { PlanCode } from "../../lib/plans.js";
import { providerSeo } from "../../services/seo.js";

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
  const [providers, activeProviders, pendingProviders, pendingClaims, pendingVerifications, openFlags, pendingReviews, users, customers, leads30, reviews30, revenue30, activeSponsored, openTickets, activeSubs] =
    await Promise.all([
      prisma.provider.count(),
      prisma.provider.count({ where: { status: "active" } }),
      prisma.provider.count({ where: { status: "pending" } }),
      prisma.providerClaim.count({ where: { status: "pending" } }),
      prisma.verification.count({ where: { status: "pending" } }),
      prisma.reportFlag.count({ where: { status: "open" } }),
      prisma.review.count({ where: { status: "pending" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.lead.count({ where: { createdAt: { gte: since30 } } }),
      prisma.review.count({ where: { createdAt: { gte: since30 } } }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: since30 }, status: "success" }, _sum: { amount: true } }),
      prisma.sponsoredListing.count({ where: { status: "active" } }),
      prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }),
      prisma.providerSubscription.count({ where: { status: { in: ["active", "past_due"] } } }),
    ]);
  const live = { status: "active" as const };
  const [leadSeries, signupSeries, seoAvg, seoGood, seoFair, seoPoor, seoHidden] = await Promise.all([
    dailySeries("leads", since14, 14),
    dailySeries("users", since14, 14),
    prisma.provider.aggregate({ where: live, _avg: { seoScore: true } }),
    prisma.provider.count({ where: { ...live, seoScore: { gte: 80 } } }),
    prisma.provider.count({ where: { ...live, seoScore: { gte: 50, lt: 80 } } }),
    prisma.provider.count({ where: { ...live, seoScore: { lt: 50 } } }),
    prisma.provider.count({ where: { ...live, seoNoIndex: true } }),
  ]);
  res.json({
    providers,
    activeProviders,
    pendingProviders,
    pendingClaims,
    pendingVerifications,
    openFlags,
    pendingReviews,
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
    // Live listings only: the pages search engines can see.
    seo: { average: Math.round(seoAvg._avg.seoScore ?? 0), good: seoGood, fair: seoFair, poor: seoPoor, hidden: seoHidden },
  });
});

/** The analytics ranges: today (1), or the last 7, 30 or 90 days, each ending today. */
const analyticsDays = z.coerce.number().int().refine((d) => [1, 7, 30, 90].includes(d)).default(30);

adminOpsRouter.get("/analytics", async (req, res) => {
  const { days } = parse(z.object({ days: analyticsDays }), req.query);
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


const METRICS = ["signups", "providers", "leads", "reviews", "tickets", "revenue"] as const;
type Breakdown = { title: string; items: { label: string; value: number }[] };
type RecentItem = { id: number; title: string; subtitle: string; value?: number; at: Date; to: string | null };
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const grouped = <T extends Record<string, unknown>>(rows: T[], key: keyof T, title: string, name: (v: string) => string = label, value?: (r: T) => number): Breakdown => ({
  title,
  items: rows
    .map((r) => ({ label: name(String(r[key] ?? "Unknown")), value: value ? value(r) : Number((r as { _count?: unknown })._count ?? 0) }))
    .sort((a, b) => b.value - a.value),
});

/** One stat card's detail for the analytics sidebar: the previous period, breakdowns and the latest records. */
adminOpsRouter.get("/analytics/details", async (req, res) => {
  const { metric, days } = parse(z.object({ metric: z.enum(METRICS), days: analyticsDays }), req.query);
  const since = startOfDay(new Date(Date.now() - (days - 1) * DAY));
  const prevSince = new Date(since.getTime() - days * DAY);
  const range = { gte: since };
  const prevRange = { gte: prevSince, lt: since };
  const take = 15;
  let total = 0;
  let previous = 0;
  let breakdowns: Breakdown[] = [];
  let recent: RecentItem[] = [];

  switch (metric) {
    case "signups": {
      const where = { createdAt: range };
      const [t, p, byRole, byStatus, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.count({ where: { createdAt: prevRange } }),
        prisma.user.groupBy({ by: ["role"], where, _count: true }),
        prisma.user.groupBy({ by: ["status"], where, _count: true }),
        prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      ]);
      total = t;
      previous = p;
      breakdowns = [grouped(byRole, "role", "By account type"), grouped(byStatus, "status", "By status")];
      recent = rows.map((u) => ({ id: Number(u.id), title: u.name, subtitle: `${label(u.role)} · ${u.email}`, at: u.createdAt, to: `/users/${u.id}` }));
      break;
    }
    case "providers": {
      const where = { createdAt: range };
      const [t, p, byStatus, byCity, rows] = await Promise.all([
        prisma.provider.count({ where }),
        prisma.provider.count({ where: { createdAt: prevRange } }),
        prisma.provider.groupBy({ by: ["status"], where, _count: true }),
        prisma.provider.groupBy({ by: ["city"], where, _count: true, orderBy: { _count: { city: "desc" } }, take: 8 }),
        prisma.provider.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, businessName: true, city: true, status: true, createdAt: true } }),
      ]);
      total = t;
      previous = p;
      breakdowns = [grouped(byStatus, "status", "By status"), grouped(byCity, "city", "By city", (v) => v)];
      recent = rows.map((r) => ({ id: Number(r.id), title: r.businessName, subtitle: `${r.city} · ${label(r.status)}`, at: r.createdAt, to: `/providers/${r.id}` }));
      break;
    }
    case "leads": {
      const where = { createdAt: range };
      const [t, p, byChannel, bySource, byStatus, rows] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.count({ where: { createdAt: prevRange } }),
        prisma.lead.groupBy({ by: ["channel"], where, _count: true }),
        prisma.lead.groupBy({ by: ["source"], where, _count: true }),
        prisma.lead.groupBy({ by: ["providerStatus"], where, _count: true }),
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, channel: true, createdAt: true, provider: { select: { id: true, businessName: true, city: true } }, user: { select: { name: true } }, category: { select: { name: true } } },
        }),
      ]);
      total = t;
      previous = p;
      breakdowns = [
        grouped(byChannel, "channel", "By channel", (v) => (v === "call" ? "Phone call" : "WhatsApp")),
        grouped(bySource, "source", "Where it started", (v) => (v === "ai_match" ? "AI match" : label(v))),
        grouped(byStatus, "providerStatus", "Provider follow-up"),
      ];
      recent = rows.map((l) => ({
        id: Number(l.id),
        title: l.provider.businessName,
        subtitle: [l.user?.name ?? "Guest", l.channel === "call" ? "Phone call" : "WhatsApp", l.category?.name].filter(Boolean).join(" · "),
        at: l.createdAt,
        to: `/providers/${l.provider.id}`,
      }));
      break;
    }
    case "reviews": {
      const where = { createdAt: range };
      const [t, p, byRating, byStatus, avg, rows] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.count({ where: { createdAt: prevRange } }),
        prisma.review.groupBy({ by: ["rating"], where, _count: true }),
        prisma.review.groupBy({ by: ["status"], where, _count: true }),
        prisma.review.aggregate({ where, _avg: { rating: true } }),
        prisma.review.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, rating: true, status: true, createdAt: true, provider: { select: { id: true, businessName: true } }, user: { select: { name: true } } },
        }),
      ]);
      total = t;
      previous = p;
      const ratings = grouped(byRating, "rating", "By rating", (v) => `${v} star${v === "1" ? "" : "s"}`);
      ratings.items.sort((a, b) => b.label.localeCompare(a.label));
      breakdowns = [
        { title: `Average rating ${avg._avg.rating ? avg._avg.rating.toFixed(1) : "–"}`, items: ratings.items },
        grouped(byStatus, "status", "By status"),
      ];
      recent = rows.map((r) => ({ id: Number(r.id), title: r.provider.businessName, subtitle: `${r.rating}★ by ${r.user.name} · ${label(r.status)}`, at: r.createdAt, to: `/providers/${r.provider.id}` }));
      break;
    }
    case "tickets": {
      const where = { createdAt: range };
      const [t, p, byStatus, byPriority, byCategory, rows] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.count({ where: { createdAt: prevRange } }),
        prisma.supportTicket.groupBy({ by: ["status"], where, _count: true }),
        prisma.supportTicket.groupBy({ by: ["priority"], where, _count: true }),
        prisma.supportTicket.groupBy({ by: ["category"], where, _count: true }),
        prisma.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, subject: true, name: true, status: true, priority: true, createdAt: true } }),
      ]);
      total = t;
      previous = p;
      breakdowns = [grouped(byStatus, "status", "By status"), grouped(byPriority, "priority", "By priority"), grouped(byCategory, "category", "By topic")];
      recent = rows.map((r) => ({ id: Number(r.id), title: r.subject, subtitle: `${r.name} · ${label(r.status)} · ${label(r.priority)} priority`, at: r.createdAt, to: `/support/${r.id}` }));
      break;
    }
    case "revenue": {
      const where = { createdAt: range, status: "success" as const };
      const [t, p, byType, byGateway, rows] = await Promise.all([
        prisma.transaction.aggregate({ where, _sum: { amount: true }, _count: true }),
        prisma.transaction.aggregate({ where: { createdAt: prevRange, status: "success" }, _sum: { amount: true } }),
        prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
        prisma.transaction.groupBy({ by: ["gateway"], where, _sum: { amount: true } }),
        prisma.transaction.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, type: true, gateway: true, amount: true, createdAt: true, provider: { select: { id: true, businessName: true } } } }),
      ]);
      total = Number(t._sum.amount ?? 0);
      previous = Number(p._sum.amount ?? 0);
      const amount = (r: { _sum: { amount: Prisma.Decimal | null } }) => Number(r._sum.amount ?? 0);
      breakdowns = [
        grouped(byType, "type", `By source · ${t._count} payment${t._count === 1 ? "" : "s"}`, (v) => ({ subscription: "Plans", lead_fee: "Lead fees", sponsored_ad: "Promotions" })[v] ?? label(v), amount),
        grouped(byGateway, "gateway", "By payment method", label, amount),
      ];
      recent = rows.map((r) => ({ id: Number(r.id), title: r.provider.businessName, subtitle: `${label(r.type)} · ${label(r.gateway)}`, value: Number(r.amount), at: r.createdAt, to: `/providers/${r.provider.id}` }));
      break;
    }
  }
  res.json({ metric, days, total, previous, breakdowns, recent });
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
      subscriptions: { orderBy: { startDate: "desc" }, take: 10, include: { plan: { select: { id: true, code: true, name: true, price: true } } } },
      invoices: { orderBy: { issuedAt: "desc" }, take: 10 },
      sponsoredListings: { orderBy: { startDate: "desc" }, take: 5, include: { category: { select: { name: true } } } },
      claims: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true, email: true } } } },
      portfolio: { take: 6 },
      businessHours: true,
      serviceAreas: true,
    },
  });
  if (!provider) throw notFound("Provider not found");
  const since30 = new Date(Date.now() - 30 * DAY);
  const [leads30, leadsAll, openTickets, recentReviews, seo] = await Promise.all([
    prisma.lead.count({ where: { providerId: id, createdAt: { gte: since30 } } }),
    prisma.lead.count({ where: { providerId: id } }),
    prisma.supportTicket.count({ where: { providerId: id, status: { in: ["open", "pending"] } } }),
    prisma.review.findMany({ where: { providerId: id }, orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
    providerSeo(id),
  ]);
  const { location: _location, invoices, subscriptions, ...rest } = provider as typeof provider & { location?: unknown };
  res.json({
    provider: {
      ...rest,
      subscriptions: subscriptions.map((s) => ({ ...s, externalUrl: externalSubscriptionUrl(s) })),
      invoices: invoices.map(presentInvoice),
    },
    plan: await getPlanState(id),
    stats: { leads30, leadsAll, openTickets },
    recentReviews,
    seo,
  });
});

const subscriptionSchema = z.object({
  planId: z.number().int().positive(),
  months: z.number().int().min(1).max(36),
  note: z.string().trim().max(200).optional(),
  /** Set when the provider paid (UPI, bank transfer); left out for free grants. */
  payment: offlinePaymentSchema.optional(),
});

/**
 * Gives a provider a plan: after an offline payment (recorded with it, and invoiced), or free as a
 * launch offer or goodwill extension. It replaces any web plan; store plans must end in the store first.
 */
adminOpsRouter.post("/providers/:id/subscription", async (req, res) => {
  const body = parse(subscriptionSchema, req.body);
  const providerId = idParam(req.params.id as string);
  const [provider, plan, live] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } }),
    prisma.subscriptionPlan.findUnique({ where: { id: BigInt(body.planId) } }),
    liveSubscription(providerId),
  ]);
  if (!provider) throw notFound("Provider not found");
  if (!plan || !plan.isActive) throw badRequest("Choose an active plan");
  if (live && (live.source === "app_store" || live.source === "play_store")) {
    throw conflict("This provider pays through the app store. They need to cancel there before the team can set their plan.");
  }
  // A web subscription would keep charging, so it is stopped now.
  if (live?.source === "razorpay" && live.externalId && live.autoRenew) await razorpay.cancelSubscription(live.externalId, false).catch(() => undefined);
  const end = new Date();
  end.setMonth(end.getMonth() + body.months);
  const subscription = await applySubscriptionChange({
    providerId,
    planCode: plan.code as PlanCode,
    billingCycle: body.months >= 12 ? "yearly" : "monthly",
    source: "admin",
    status: "active",
    periodEnd: end,
    autoRenew: false,
  });
  if (body.payment) await recordPayment(currentUser(req).id, providerId, "subscription", body.payment, subscription?.id ?? null);
  await logAdmin(currentUser(req).id, "subscription.grant", "provider", providerId, body);
  res.status(201).json({ subscription });
});

/** Takes a provider back to Free now: ends a team-granted plan, or cancels a web subscription at Razorpay. */
adminOpsRouter.delete("/providers/:id/subscription", async (req, res) => {
  const providerId = idParam(req.params.id as string);
  const { note } = parse(z.object({ note: z.string().trim().max(200).optional() }), req.body ?? {});
  const live = await liveSubscription(providerId);
  if (!live) throw badRequest("This provider is already on Free");
  await endSubscription(live);
  await logAdmin(currentUser(req).id, "subscription.revoke", "provider", providerId, { subscriptionId: Number(live.id), note });
  res.json({ ok: true });
});

async function endSubscription(sub: { id: bigint; providerId: bigint; source: string; externalId: string | null; billingCycle: "monthly" | "yearly"; endDate: Date | null }) {
  if (sub.source === "app_store" || sub.source === "play_store") throw badRequest("Store subscriptions can only be cancelled by the subscriber in the store");
  if (sub.source === "razorpay" && sub.externalId) await razorpay.cancelSubscription(sub.externalId, false);
  await applySubscriptionChange({
    providerId: sub.providerId,
    planCode: "free",
    billingCycle: sub.billingCycle,
    source: sub.source as SubscriptionSource,
    externalId: sub.externalId,
    status: "cancelled",
    periodEnd: new Date(),
    autoRenew: false,
  });
}

adminOpsRouter.patch("/subscriptions/:id", async (req, res) => {
  const body = parse(
    z.object({ status: z.enum(["active", "expired", "cancelled"]).optional(), endDate: z.coerce.date().optional(), autoRenew: z.boolean().optional() }),
    req.body,
  );
  const id = idParam(req.params.id as string);
  const before = await prisma.providerSubscription.findUnique({ where: { id } });
  if (!before) throw notFound("Subscription not found");
  const live = before.status === "active" || before.status === "past_due";
  if ((body.status === "cancelled" || body.status === "expired") && live) {
    await endSubscription(before);
  } else if (before.source !== "admin" && (body.endDate || body.autoRenew !== undefined || body.status === "active")) {
    throw badRequest("Dates and renewal of paid subscriptions follow Razorpay or the app store. Only cancelling is possible here.");
  } else if (body.endDate || body.autoRenew !== undefined) {
    await prisma.providerSubscription.update({ where: { id }, data: { endDate: body.endDate, autoRenew: body.autoRenew } });
  }
  await logAdmin(currentUser(req).id, "subscription.update", "provider_subscription", id, body);
  res.json({ subscription: await prisma.providerSubscription.findUnique({ where: { id } }) });
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
