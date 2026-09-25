import { Router } from "express";
import { z } from "zod";
import { httpUrl } from "../lib/rules.js";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { currentUser, optionalAuth, requireAuth } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
import { recalculateProvider } from "../services/ranking.js";
import { getNumberSetting } from "../services/settings.js";
import { storage } from "../storage/index.js";
import { limits } from "../lib/rate-limit.js";

export const reviewsRouter = Router();

const createSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(1, "Write a few words about your experience").max(2000),
  photos: z.array(httpUrl).max(6).optional(),
});

/** The minimum length is an admin setting, so it is checked here rather than in the schema. */
async function checkReviewLength(text: string | undefined) {
  if (text === undefined) return;
  const min = await getNumberSetting("min_review_length", 10);
  if (text.length < min) {
    const message = `Tell others a little more (at least ${min} characters)`;
    throw badRequest(message, [{ path: "reviewText", message }]);
  }
}

/** POST /reviews — one review per customer per provider; linked to their latest lead if any. */
reviewsRouter.post("/", limits.reviews, requireAuth, async (req, res) => {
  const body = parse(createSchema, req.body);
  await checkReviewLength(body.reviewText);
  const user = currentUser(req);
  const providerId = BigInt(body.providerId);
  const provider = await prisma.provider.findFirst({ where: { id: providerId, status: "active" }, select: { id: true, userId: true } });
  if (!provider) throw notFound("Provider not found");
  if (provider.userId === user.id) throw badRequest("You cannot review your own business");

  const lead = await prisma.lead.findFirst({
    where: { providerId, userId: user.id, review: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const review = await prisma.review.create({
    data: {
      providerId,
      userId: user.id,
      rating: body.rating,
      reviewText: body.reviewText,
      leadId: lead?.id ?? null,
      photos: body.photos ? { create: body.photos.map((photoUrl) => ({ photoUrl })) } : undefined,
    },
    include: { photos: true },
  });
  await recalculateProvider(providerId);

  void notify(provider.userId, "review", `New ${body.rating}-star review`, body.reviewText.slice(0, 120), { reviewId: Number(review.id) });
  res.status(201).json({ review });
});

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  reviewText: z.string().trim().min(1, "Write a few words about your experience").max(2000).optional(),
  photos: z.array(httpUrl).max(6).optional(),
});

reviewsRouter.patch("/:id", requireAuth, async (req, res) => {
  const body = parse(updateSchema, req.body);
  await checkReviewLength(body.reviewText);
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!review) throw notFound("Review not found");
  if (review.userId !== currentUser(req).id) throw forbidden();
  const { photos, ...fields } = body;
  const old = photos ? await prisma.reviewPhoto.findMany({ where: { reviewId: review.id }, select: { photoUrl: true } }) : [];
  const updated = await prisma.$transaction(async (tx) => {
    if (photos) {
      await tx.reviewPhoto.deleteMany({ where: { reviewId: review.id } });
      if (photos.length) await tx.reviewPhoto.createMany({ data: photos.map((photoUrl) => ({ reviewId: review.id, photoUrl })) });
    }
    return tx.review.update({ where: { id: review.id }, data: fields, include: { photos: true } });
  });
  // Files the customer took out of the review are no longer referenced anywhere.
  for (const o of old) if (!photos!.includes(o.photoUrl)) void storage.remove(o.photoUrl);
  await recalculateProvider(review.providerId);
  res.json({ review: updated });
});

reviewsRouter.delete("/:id", requireAuth, async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!review) throw notFound("Review not found");
  const user = currentUser(req);
  if (review.userId !== user.id && user.role !== "super_admin") throw forbidden();
  const photos = await prisma.reviewPhoto.findMany({ where: { reviewId: review.id }, select: { photoUrl: true } });
  await prisma.review.delete({ where: { id: review.id } });
  for (const p of photos) void storage.remove(p.photoUrl);
  await recalculateProvider(review.providerId);
  res.json({ ok: true });
});

const reportSchema = z.object({ reason: z.string().trim().min(5).max(500) });

reviewsRouter.post("/:id/report", limits.reviews, optionalAuth, async (req, res) => {
  const { reason } = parse(reportSchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) }, select: { id: true } });
  if (!review) throw notFound("Review not found");
  await prisma.reportFlag.create({ data: { reporterUserId: req.user?.id ?? null, targetType: "review", targetId: review.id, reason } });
  res.status(201).json({ ok: true });
});
