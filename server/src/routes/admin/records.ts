import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { adminPaginationSchema, pageMeta } from "../../lib/pagination.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { notify } from "../../services/notify.js";
import { recalculateProvider } from "../../services/ranking.js";
import { refreshShared } from "../../services/web-cache.js";

/** Leads and reviews: the lists, their actions, and the filters the CSV export reuses. */
export const adminRecordsRouter = Router();

const DAY = 24 * 60 * 60 * 1000;

// Leads ------------------------------------------------------------------------------------------

export const leadsQuery = adminPaginationSchema.extend({
  channel: z.enum(["call", "whatsapp"]).optional(),
  providerId: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  dispute: z.enum(["open", "accepted", "rejected", "any"]).optional(),
});

export function leadWhere(q: z.infer<typeof leadsQuery>): Prisma.LeadWhereInput {
  return {
    ...(q.channel ? { channel: q.channel } : {}),
    ...(q.providerId ? { providerId: BigInt(q.providerId) } : {}),
    ...(q.days ? { createdAt: { gte: new Date(Date.now() - q.days * DAY) } } : {}),
    ...(q.dispute === "any" ? { disputeStatus: { not: "none" } } : q.dispute ? { disputeStatus: q.dispute } : {}),
  };
}

adminRecordsRouter.get("/leads", async (req, res) => {
  const q = parse(leadsQuery, req.query);
  const where = leadWhere(q);
  const [leads, total, openDisputes] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: q.dispute === "open" ? { disputedAt: "asc" } : { createdAt: "desc" },
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
    prisma.lead.count({ where: { disputeStatus: "open" } }),
  ]);
  res.json({ leads, openDisputes, ...pageMeta(q.page, q.pageSize, total) });
});

/**
 * PATCH /admin/leads/:id/dispute — decides a provider's report about a contact. Accepting removes it
 * from the provider's numbers and gives back what it cost their promotion.
 */
adminRecordsRouter.patch("/leads/:id/dispute", async (req, res) => {
  const { decision, note } = parse(z.object({ decision: z.enum(["accepted", "rejected"]), note: z.string().trim().max(500).optional() }), req.body);
  const lead = await prisma.lead.findUnique({ where: { id: idParam(req.params.id as string) }, include: { provider: { select: { userId: true, businessName: true } } } });
  if (!lead) throw notFound("Lead not found");
  if (lead.disputeStatus !== "open") throw badRequest("This report was already decided");
  const admin = currentUser(req);
  await prisma.lead.update({ where: { id: lead.id }, data: { disputeStatus: decision, disputeResolvedBy: admin.id, disputeResolvedAt: new Date() } });
  await logAdmin(admin.id, `lead.dispute_${decision}`, "lead", lead.id, { note });
  void notify(
    lead.provider.userId,
    "lead",
    decision === "accepted" ? "Your report about a contact was accepted" : "Your report about a contact was not accepted",
    decision === "accepted"
      ? "It no longer counts in your numbers."
      : note || "We checked the contact and it looks genuine.",
    { leadId: Number(lead.id) },
  );
  res.json({ ok: true });
});

// Reviews ----------------------------------------------------------------------------------------

export const reviewsQuery = adminPaginationSchema.extend({
  status: z.enum(["pending", "published", "flagged", "removed"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  q: z.string().trim().max(100).optional(),
});

export function reviewWhere(q: z.infer<typeof reviewsQuery>): Prisma.ReviewWhereInput {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q ? { OR: [{ reviewText: { contains: q.q, mode: "insensitive" } }, { provider: { businessName: { contains: q.q, mode: "insensitive" } } }] } : {}),
  };
}

adminRecordsRouter.get("/reviews", async (req, res) => {
  const q = parse(reviewsQuery, req.query);
  const where = reviewWhere(q);
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
        edits: { orderBy: { createdAt: "desc" }, take: 10, select: { rating: true, reviewText: true, createdAt: true } },
      },
      omit: { ipHash: true, deviceHash: true },
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

const reviewStatus = z.enum(["published", "flagged", "removed"]);

/**
 * Sets a review's status, closes its open reports and updates the provider's rating. Deciding on a held
 * (pending) review tells its author, and publishing one tells the business as a new review would have.
 */
async function moderateReview(adminId: bigint, id: bigint, status: z.infer<typeof reviewStatus>) {
  const before = await prisma.review.findUniqueOrThrow({ where: { id }, select: { status: true } });
  const review = await prisma.review.update({ where: { id }, data: { status }, include: { provider: { select: { userId: true, slug: true, businessName: true } } } });
  if (before.status === "pending") {
    const data = { reviewId: Number(id), providerSlug: review.provider.slug };
    if (status === "published") {
      void notify(review.userId, "review", "Your review is live", `Thanks for reviewing ${review.provider.businessName}.`, data);
      void notify(review.provider.userId, "review", `New ${review.rating}-star review`, (review.reviewText ?? "").slice(0, 120), { reviewId: Number(id) });
    } else if (status === "removed") {
      void notify(review.userId, "review", "Your review was not published", `Your review of ${review.provider.businessName} does not meet our review guidelines.`, data);
    }
  }
  await prisma.reportFlag.updateMany({ where: { targetType: "review", targetId: id, status: "open" }, data: { status: "resolved", resolvedBy: adminId } });
  await recalculateProvider(review.providerId);
  refreshShared("reviews");
  await logAdmin(adminId, "review.moderate", "review", id, { status });
  return review;
}

adminRecordsRouter.patch("/reviews/:id", async (req, res) => {
  const { status } = parse(z.object({ status: reviewStatus }), req.body);
  res.json({ review: await moderateReview(currentUser(req).id, idParam(req.params.id as string), status) });
});

adminRecordsRouter.post("/reviews/bulk", async (req, res) => {
  const body = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), status: z.enum(["published", "removed"]) }), req.body);
  const adminId = currentUser(req).id;
  let updated = 0;
  for (const id of new Set(body.ids)) await moderateReview(adminId, BigInt(id), body.status).then(() => updated++, () => undefined);
  res.json({ updated });
});
