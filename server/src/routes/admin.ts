import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { currentUser } from "../middleware/auth.js";
import { guardAdminPath, requireStaff } from "../lib/permissions.js";
import { adminOpsRouter } from "./admin/operations.js";
import { adminSettingsRouter } from "./admin/settings.js";
import { adminSupportRouter } from "./admin/support.js";
import { adminTeamRouter } from "./admin/team.js";
import { logAdmin } from "../services/audit.js";
import { notify } from "../services/notify.js";
import { recalculateCategoryCounts, recalculateProvider } from "../services/ranking.js";

/**
 * Admin endpoints for the super admin and their team. Each path is guarded by the module it
 * belongs to (lib/permissions.ts). Every write is recorded in admin_activity_logs.
 */
export const adminRouter = Router();
adminRouter.use(requireStaff, guardAdminPath);
adminRouter.use(adminTeamRouter, adminSupportRouter, adminSettingsRouter, adminOpsRouter);

const providerQuery = paginationSchema.extend({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  verification: z.enum(["none", "partial", "verified"]).optional(),
  claimed: z.enum(["yes", "no"]).optional(),
  city: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
});

adminRouter.get("/providers", async (req, res) => {
  const q = parse(providerQuery, req.query);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.verification ? { verificationStatus: q.verification } : {}),
    ...(q.claimed ? { userId: q.claimed === "yes" ? { not: null } : null } : {}),
    ...(q.city ? { city: { equals: q.city, mode: "insensitive" as const } } : {}),
    ...(q.q ? { OR: [{ businessName: { contains: q.q, mode: "insensitive" as const } }, { phone: { contains: q.q } }] } : {}),
  };
  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        slug: true,
        businessName: true,
        city: true,
        locality: true,
        phone: true,
        logoUrl: true,
        status: true,
        verificationStatus: true,
        userId: true,
        avgRating: true,
        totalReviews: true,
        profileCompletenessPct: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        services: { where: { isPrimary: true }, take: 1, select: { category: { select: { name: true } } } },
      },
    }),
    prisma.provider.count({ where }),
  ]);
  res.json({ providers, ...pageMeta(q.page, q.pageSize, total) });
});

const providerStatusSchema = z.object({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  verificationStatus: z.enum(["none", "partial", "verified"]).optional(),
});

adminRouter.patch("/providers/:id", async (req, res) => {
  const body = parse(providerStatusSchema, req.body);
  const id = idParam(req.params.id as string);
  const before = await prisma.provider.findUnique({ where: { id }, select: { status: true } });
  if (!before) throw notFound("Provider not found");
  const provider = await prisma.provider.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "provider.update", "provider", id, body);
  if (body.status && body.status !== before.status) {
    const copy: Record<string, [string, string]> = {
      active: ["Your listing is live", "Customers can now find and contact you on DialNFind."],
      suspended: ["Your listing is suspended", "Your listing is hidden from search. Contact support to resolve this."],
      rejected: ["Your listing was not approved", "Please review your details and contact support if you need help."],
      pending: ["Your listing is under review", "We will let you know once it is approved."],
    };
    void notify(provider.userId, "listing", copy[body.status][0], copy[body.status][1], { providerId: Number(id) });
  }
  await recalculateProvider(id);
  await recalculateCategoryCounts();
  res.json({ provider: { id: provider.id, status: provider.status, verificationStatus: provider.verificationStatus } });
});

const queueQuery = z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending") });

adminRouter.get("/claims", async (req, res) => {
  const { status } = parse(queueQuery, req.query);
  const claims = await prisma.providerClaim.findMany({
    where: { status },
    orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
    take: 200,
    include: { provider: { select: { id: true, businessName: true, city: true } }, user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ claims });
});

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]), notes: z.string().trim().max(300).optional() });

adminRouter.patch("/claims/:id", async (req, res) => {
  const { decision } = parse(decisionSchema, req.body);
  const admin = currentUser(req);
  const claim = await prisma.providerClaim.findUnique({ where: { id: idParam(req.params.id as string) }, include: { provider: true } });
  if (!claim) throw notFound("Claim not found");
  if (claim.status !== "pending") throw badRequest("Claim already decided");
  if (decision === "approved" && claim.provider.userId) throw badRequest("Listing already has an owner");
  await prisma.$transaction([
    prisma.providerClaim.update({ where: { id: claim.id }, data: { status: decision, reviewedBy: admin.id, reviewedAt: new Date() } }),
    ...(decision === "approved"
      ? [
          prisma.provider.update({ where: { id: claim.providerId }, data: { userId: claim.userId, claimedAt: new Date() } }),
          prisma.user.updateMany({ where: { id: claim.userId, role: "customer" }, data: { role: "provider" } }),
        ]
      : []),
  ]);
  await logAdmin(admin.id, `claim.${decision}`, "provider_claim", claim.id);
  void notify(
    claim.userId,
    "claim",
    decision === "approved" ? `${claim.provider.businessName} is now yours` : "Your claim was not approved",
    decision === "approved"
      ? "Your document was accepted. Sign in to the provider app to manage your listing."
      : `We could not confirm you own ${claim.provider.businessName}. Contact support if you think this is a mistake.`,
    { providerId: Number(claim.providerId), claimId: Number(claim.id) },
  );
  res.json({ ok: true });
});

adminRouter.get("/verifications", async (req, res) => {
  const { status } = parse(queueQuery, req.query);
  const verifications = await prisma.verification.findMany({
    where: { status },
    orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
    take: 200,
    include: { provider: { select: { id: true, businessName: true, city: true, slug: true, verificationStatus: true } }, verifier: { select: { name: true } } },
  });
  res.json({ verifications });
});

adminRouter.patch("/verifications/:id", async (req, res) => {
  const { decision, notes } = parse(decisionSchema, req.body);
  const admin = currentUser(req);
  const id = idParam(req.params.id as string);
  if (decision === "rejected" && !notes) throw badRequest("Tell the provider why the document was not accepted");
  const verification = await prisma.verification.update({
    where: { id },
    data: { status: decision, verifiedBy: admin.id, verifiedAt: new Date(), ...(notes !== undefined ? { notes } : {}) },
  });
  // verified = phone + business (or ID) approved; partial = anything approved.
  const approved = await prisma.verification.findMany({ where: { providerId: verification.providerId, status: "approved" }, select: { type: true } });
  const types = new Set(approved.map((a) => a.type));
  const status = types.has("phone") && (types.has("business") || types.has("id_proof")) ? "verified" : types.size ? "partial" : "none";
  await prisma.provider.update({ where: { id: verification.providerId }, data: { verificationStatus: status } });
  await recalculateProvider(verification.providerId);
  await logAdmin(admin.id, `verification.${decision}`, "verification", id);
  const owner = await prisma.provider.findUnique({ where: { id: verification.providerId }, select: { userId: true } });
  const label = { phone: "Phone", business: "Business registration", location: "Business address", id_proof: "Owner identity" }[verification.type];
  void notify(
    owner?.userId,
    "verification",
    decision === "approved" ? `${label} verified` : `${label} document not accepted`,
    decision === "approved" ? "Your verification badge on DialNFind has been updated." : `${notes} Please upload a new document from the Verification page.`,
    { verificationId: Number(id) },
  );
  res.json({ verification, verificationStatus: status });
});

adminRouter.get("/flags", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["open", "resolved", "dismissed"]).default("open") }), req.query);
  const flags = await prisma.reportFlag.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { reporter: { select: { id: true, name: true, email: true } } },
  });
  // Attach a short description of what was reported so the queue can be worked without lookups.
  const ids = (t: "review" | "provider") => flags.filter((f) => f.targetType === t).map((f) => f.targetId);
  const [reviews, providers] = await Promise.all([
    prisma.review.findMany({ where: { id: { in: ids("review") } }, select: { id: true, rating: true, reviewText: true, status: true, provider: { select: { id: true, businessName: true } }, user: { select: { name: true } } } }),
    prisma.provider.findMany({ where: { id: { in: ids("provider") } }, select: { id: true, businessName: true, city: true, status: true } }),
  ]);
  const reviewMap = new Map(reviews.map((r) => [r.id.toString(), r]));
  const providerMap = new Map(providers.map((p) => [p.id.toString(), p]));
  res.json({
    flags: flags.map((f) => ({
      ...f,
      review: f.targetType === "review" ? (reviewMap.get(f.targetId.toString()) ?? null) : null,
      provider: f.targetType === "provider" ? (providerMap.get(f.targetId.toString()) ?? null) : null,
    })),
  });
});

adminRouter.patch("/flags/:id", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["resolved", "dismissed"]) }), req.body);
  const id = idParam(req.params.id as string);
  const flag = await prisma.reportFlag.update({ where: { id }, data: { status, resolvedBy: currentUser(req).id } });
  await logAdmin(currentUser(req).id, `flag.${status}`, "report_flag", id);
  res.json({ flag });
});

const reviewModerationSchema = z.object({ status: z.enum(["published", "flagged", "removed"]) });

adminRouter.patch("/reviews/:id", async (req, res) => {
  const { status } = parse(reviewModerationSchema, req.body);
  const id = idParam(req.params.id as string);
  const review = await prisma.review.update({ where: { id }, data: { status } });
  await prisma.reportFlag.updateMany({
    where: { targetType: "review", targetId: id, status: "open" },
    data: { status: "resolved", resolvedBy: currentUser(req).id },
  });
  await recalculateProvider(review.providerId);
  await logAdmin(currentUser(req).id, "review.moderate", "review", id, { status });
  res.json({ review });
});

adminRouter.get("/contact-messages", async (_req, res) => {
  res.json({ messages: await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
});

adminRouter.patch("/contact-messages/:id", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["new", "in_progress", "closed"]) }), req.body);
  const id = idParam(req.params.id as string);
  const message = await prisma.contactMessage.update({ where: { id }, data: { status } });
  await logAdmin(currentUser(req).id, "contact_message.update", "contact_message", id, { status });
  res.json({ message });
});

// Users ----------------------------------------------------------------------------------------

const usersQuery = paginationSchema.extend({
  q: z.string().trim().optional(),
  role: z.enum(["super_admin", "admin", "provider", "customer"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
});

adminRouter.get("/users", async (req, res) => {
  const q = parse(usersQuery, req.query);
  const where = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { email: { contains: q.q, mode: "insensitive" as const } }, { phone: { contains: q.q } }] }
      : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        profilePhotoUrl: true,
        provider: { select: { id: true, businessName: true, slug: true } },
        _count: { select: { reviews: true, leads: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, ...pageMeta(q.page, q.pageSize, total) });
});

adminRouter.patch("/users/:id", async (req, res) => {
  // Admin and super admin access is managed from Team, not here.
  const body = parse(z.object({ status: z.enum(["active", "suspended", "deleted"]).optional() }), req.body);
  const admin = currentUser(req);
  const id = idParam(req.params.id as string);
  if (id === admin.id) throw badRequest("You cannot change your own account here");
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) throw notFound("User not found");
  if (target.role === "super_admin" || target.role === "admin") throw badRequest("Manage team members from Team");
  const user = await prisma.user.update({ where: { id }, data: body, select: { id: true, role: true, status: true } });
  await logAdmin(admin.id, "user.update", "user", id, body);
  res.json({ user });
});

// Activity log ----------------------------------------------------------------------------------

adminRouter.get("/activity-logs", async (req, res) => {
  const q = parse(paginationSchema.extend({ targetType: z.string().optional(), adminId: z.coerce.number().int().optional() }), req.query);
  const where = { ...(q.targetType ? { targetType: q.targetType } : {}), ...(q.adminId ? { adminId: BigInt(q.adminId) } : {}) };
  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { admin: { select: { id: true, name: true } } },
    }),
    prisma.adminActivityLog.count({ where }),
  ]);
  res.json({ logs, ...pageMeta(q.page, q.pageSize, total) });
});

// Search insights -------------------------------------------------------------------------------

adminRouter.get("/search-insights", async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
  const since = new Date(Date.now() - days * 864e5);
  const [totals, topQueries, zeroResults, byCategory] = await Promise.all([
    prisma.searchQuery.aggregate({ where: { createdAt: { gte: since } }, _count: true, _avg: { resultsCount: true } }),
    prisma.$queryRaw<{ query: string; count: bigint; avg_results: number }[]>`
      SELECT MODE() WITHIN GROUP (ORDER BY raw_query) AS query, COUNT(*)::bigint AS count, AVG(results_count)::float AS avg_results
      FROM search_queries WHERE created_at >= ${since} AND raw_query <> ''
      GROUP BY LOWER(raw_query) ORDER BY count DESC LIMIT 20`,
    prisma.$queryRaw<{ query: string; count: bigint }[]>`
      SELECT MODE() WITHIN GROUP (ORDER BY raw_query) AS query, COUNT(*)::bigint AS count
      FROM search_queries WHERE created_at >= ${since} AND results_count = 0 AND raw_query <> ''
      GROUP BY LOWER(raw_query) ORDER BY count DESC LIMIT 20`,
    prisma.$queryRaw<{ category: string | null; count: bigint }[]>`
      SELECT c.name AS category, COUNT(*)::bigint AS count
      FROM search_queries s LEFT JOIN categories c ON c.id = s.parsed_category_id
      WHERE s.created_at >= ${since} GROUP BY c.name ORDER BY count DESC`,
  ]);
  res.json({
    days,
    totalSearches: totals._count,
    avgResults: totals._avg.resultsCount ?? 0,
    topQueries: topQueries.map((r) => ({ query: r.query, count: Number(r.count), avgResults: Math.round(r.avg_results * 10) / 10 })),
    zeroResultQueries: zeroResults.map((r) => ({ query: r.query, count: Number(r.count) })),
    byCategory: byCategory.map((r) => ({ category: r.category ?? "Unmatched", count: Number(r.count) })),
  });
});

// Badges ----------------------------------------------------------------------------------------

const badgeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  iconUrl: z.string().url().nullable().optional(),
  criteriaDescription: z.string().trim().max(300).nullable().optional(),
});

adminRouter.get("/badges", async (_req, res) => {
  const badges = await prisma.badge.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { providers: true } } } });
  res.json({ badges });
});

adminRouter.post("/badges", async (req, res) => {
  const body = parse(badgeSchema, req.body);
  const badge = await prisma.badge.create({ data: body });
  await logAdmin(currentUser(req).id, "badge.create", "badge", badge.id, body);
  res.status(201).json({ badge });
});

adminRouter.patch("/badges/:id", async (req, res) => {
  const body = parse(badgeSchema.partial(), req.body);
  const id = idParam(req.params.id as string);
  const badge = await prisma.badge.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "badge.update", "badge", id, body);
  res.json({ badge });
});

adminRouter.delete("/badges/:id", async (req, res) => {
  const id = idParam(req.params.id as string);
  const plans = await prisma.subscriptionPlan.count({ where: { badgeId: id, isActive: true } });
  if (plans) throw badRequest("This badge is granted by an active plan. Change the plan first.");
  await prisma.badge.delete({ where: { id } });
  await logAdmin(currentUser(req).id, "badge.delete", "badge", id);
  res.json({ ok: true });
});

adminRouter.post("/providers/:id/badges", async (req, res) => {
  const { badgeId } = parse(z.object({ badgeId: z.number().int().positive() }), req.body);
  const providerId = idParam(req.params.id as string);
  const [provider, badge] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId }, select: { userId: true } }),
    prisma.badge.findUnique({ where: { id: BigInt(badgeId) } }),
  ]);
  if (!provider || !badge) throw notFound("Provider or badge not found");
  const awarded = await prisma.providerBadge.upsert({
    where: { providerId_badgeId: { providerId, badgeId: badge.id } },
    create: { providerId, badgeId: badge.id },
    update: {},
  });
  await logAdmin(currentUser(req).id, "badge.award", "provider", providerId, { badgeId });
  void notify(provider.userId, "listing", `You earned the ${badge.name} badge`, "It now shows on your DialNFind profile.", { badgeId });
  res.status(201).json({ providerBadge: awarded });
});

adminRouter.delete("/providers/:id/badges/:badgeId", async (req, res) => {
  const providerId = idParam(req.params.id as string);
  const badgeId = idParam(req.params.badgeId as string);
  await prisma.providerBadge.deleteMany({ where: { providerId, badgeId } });
  await logAdmin(currentUser(req).id, "badge.revoke", "provider", providerId, { badgeId });
  res.json({ ok: true });
});

// Subscription plans and transactions ------------------------------------------------------------

const planSchema = z.object({
  name: z.string().trim().min(2).max(40),
  price: z.number().min(0).max(1_000_000),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  leadAccessLimit: z.number().int().min(0).nullable().optional(),
  analyticsEnabled: z.boolean().optional(),
  rankingBoost: z.number().min(0).max(0.2).optional(),
  badgeId: z.number().int().positive().nullable().optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  isActive: z.boolean().optional(),
});

function planData(body: Partial<z.infer<typeof planSchema>>) {
  const { features, badgeId, ...rest } = body;
  return {
    ...rest,
    ...(badgeId !== undefined ? { badgeId: badgeId === null ? null : BigInt(badgeId) } : {}),
    ...(features !== undefined ? { featuresJson: features } : {}),
  };
}

adminRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
    include: { badge: true, _count: { select: { subscriptions: { where: { status: "active" } } } } },
  });
  res.json({ plans });
});

adminRouter.post("/plans", async (req, res) => {
  const body = parse(planSchema, req.body);
  const plan = await prisma.subscriptionPlan.create({ data: planData(body) as Parameters<typeof prisma.subscriptionPlan.create>[0]["data"] });
  await logAdmin(currentUser(req).id, "plan.create", "subscription_plan", plan.id, body);
  res.status(201).json({ plan });
});

/** Plans are never hard-deleted because subscriptions reference them; set isActive to false instead. */
adminRouter.patch("/plans/:id", async (req, res) => {
  const body = parse(planSchema.partial(), req.body);
  const id = idParam(req.params.id as string);
  const plan = await prisma.subscriptionPlan.update({ where: { id }, data: planData(body) });
  await logAdmin(currentUser(req).id, "plan.update", "subscription_plan", id, body);
  res.json({ plan });
});

adminRouter.get("/transactions", async (req, res) => {
  const q = parse(
    paginationSchema.extend({
      status: z.enum(["pending", "success", "failed", "refunded"]).optional(),
      type: z.enum(["subscription", "lead_fee", "sponsored_ad"]).optional(),
    }),
    req.query,
  );
  const where = { ...(q.status ? { status: q.status } : {}), ...(q.type ? { type: q.type } : {}) };
  const [transactions, total, sum] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { provider: { select: { id: true, businessName: true, slug: true } } },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({ where: { ...where, status: "success" }, _sum: { amount: true } }),
  ]);
  res.json({ transactions, revenue: sum._sum.amount ?? 0, ...pageMeta(q.page, q.pageSize, total) });
});

// Sponsored listings ----------------------------------------------------------------------------

adminRouter.get("/sponsored", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["active", "paused", "completed"]).optional() }), req.query);
  const listings = await prisma.sponsoredListing.findMany({
    where: status ? { status } : {},
    orderBy: { startDate: "desc" },
    include: { provider: { select: { id: true, businessName: true, slug: true, city: true } }, category: { select: { id: true, name: true } } },
  });
  res.json({ listings });
});

const adminSponsoredSchema = z.object({
  providerId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  targetLocation: z.string().trim().max(80).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.number().min(0).max(10_000_000),
});

adminRouter.post("/sponsored", async (req, res) => {
  const body = parse(adminSponsoredSchema, req.body);
  if (body.endDate < body.startDate) throw badRequest("End date must be after the start date");
  const listing = await prisma.sponsoredListing.create({
    data: { ...body, providerId: BigInt(body.providerId), categoryId: BigInt(body.categoryId) },
  });
  await logAdmin(currentUser(req).id, "sponsored.create", "sponsored_listing", listing.id, body);
  res.status(201).json({ listing });
});

adminRouter.patch("/sponsored/:id", async (req, res) => {
  const body = parse(
    z.object({
      status: z.enum(["active", "paused", "completed"]).optional(),
      endDate: z.coerce.date().optional(),
      budget: z.number().min(0).optional(),
      targetLocation: z.string().trim().max(80).nullable().optional(),
    }),
    req.body,
  );
  const id = idParam(req.params.id as string);
  const listing = await prisma.sponsoredListing.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "sponsored.update", "sponsored_listing", id, body);
  res.json({ listing });
});
