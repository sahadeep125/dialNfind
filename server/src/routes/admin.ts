import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, notFound } from "../lib/errors.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { currentUser, requireRole } from "../middleware/auth.js";
import { logAdmin } from "../services/audit.js";
import { recalculateCategoryCounts, recalculateProvider } from "../services/ranking.js";

/** Super-admin moderation endpoints. Every write is recorded in admin_activity_logs. */
export const adminRouter = Router();
adminRouter.use(requireRole("super_admin"));

adminRouter.get("/overview", async (_req, res) => {
  const [providers, pendingProviders, pendingClaims, pendingVerifications, openFlags, users, leads30] = await Promise.all([
    prisma.provider.count(),
    prisma.provider.count({ where: { status: "pending" } }),
    prisma.providerClaim.count({ where: { status: "pending" } }),
    prisma.verification.count({ where: { status: "pending" } }),
    prisma.reportFlag.count({ where: { status: "open" } }),
    prisma.user.count(),
    prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
  ]);
  res.json({ providers, pendingProviders, pendingClaims, pendingVerifications, openFlags, users, leads30 });
});

const providerQuery = paginationSchema.extend({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  q: z.string().optional(),
});

adminRouter.get("/providers", async (req, res) => {
  const q = parse(providerQuery, req.query);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { businessName: { contains: q.q, mode: "insensitive" as const } } : {}),
  };
  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: { id: true, slug: true, businessName: true, city: true, status: true, verificationStatus: true, userId: true, avgRating: true, totalReviews: true, createdAt: true },
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
  const provider = await prisma.provider.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "provider.update", "provider", id, body);
  await recalculateProvider(id);
  await recalculateCategoryCounts();
  res.json({ provider: { id: provider.id, status: provider.status, verificationStatus: provider.verificationStatus } });
});

adminRouter.get("/claims", async (_req, res) => {
  const claims = await prisma.providerClaim.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { provider: { select: { id: true, businessName: true, city: true } }, user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ claims });
});

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

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
      ? [prisma.provider.update({ where: { id: claim.providerId }, data: { userId: claim.userId, claimedAt: new Date() } })]
      : []),
  ]);
  await logAdmin(admin.id, `claim.${decision}`, "provider_claim", claim.id);
  res.json({ ok: true });
});

adminRouter.get("/verifications", async (_req, res) => {
  const verifications = await prisma.verification.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { provider: { select: { id: true, businessName: true, city: true } } },
  });
  res.json({ verifications });
});

adminRouter.patch("/verifications/:id", async (req, res) => {
  const { decision } = parse(decisionSchema, req.body);
  const admin = currentUser(req);
  const id = idParam(req.params.id as string);
  const verification = await prisma.verification.update({
    where: { id },
    data: { status: decision, verifiedBy: admin.id, verifiedAt: new Date() },
  });
  // verified = phone + business (or ID) approved; partial = anything approved.
  const approved = await prisma.verification.findMany({ where: { providerId: verification.providerId, status: "approved" }, select: { type: true } });
  const types = new Set(approved.map((a) => a.type));
  const status = types.has("phone") && (types.has("business") || types.has("id_proof")) ? "verified" : types.size ? "partial" : "none";
  await prisma.provider.update({ where: { id: verification.providerId }, data: { verificationStatus: status } });
  await recalculateProvider(verification.providerId);
  await logAdmin(admin.id, `verification.${decision}`, "verification", id);
  res.json({ verification, verificationStatus: status });
});

adminRouter.get("/flags", async (_req, res) => {
  const flags = await prisma.reportFlag.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" } });
  res.json({ flags });
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

adminRouter.get("/settings", async (_req, res) => {
  res.json({ settings: await prisma.setting.findMany({ orderBy: { key: "asc" } }) });
});

adminRouter.put("/settings/:key", async (req, res) => {
  const { value } = parse(z.object({ value: z.string().max(500) }), req.body);
  const key = req.params.key as string;
  const setting = await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  await logAdmin(currentUser(req).id, "setting.update", "setting", setting.id, { key, value });
  res.json({ setting });
});

adminRouter.get("/contact-messages", async (_req, res) => {
  res.json({ messages: await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
});
