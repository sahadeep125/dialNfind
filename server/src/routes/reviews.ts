import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { currentUser, optionalAuth, requireAuth } from "../middleware/auth.js";
import { recalculateProvider } from "../services/ranking.js";

export const reviewsRouter = Router();

const createSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(10, "Tell others a little more (at least 10 characters)").max(2000),
  photos: z.array(z.string().url()).max(6).optional(),
});

/** POST /reviews — one review per customer per provider; linked to their latest lead if any. */
reviewsRouter.post("/", requireAuth, async (req, res) => {
  const body = parse(createSchema, req.body);
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

  if (provider.userId) {
    void prisma.notification
      .create({
        data: {
          userId: provider.userId,
          type: "review",
          title: `New ${body.rating}-star review`,
          body: body.reviewText.slice(0, 120),
          dataJson: { reviewId: Number(review.id) },
        },
      })
      .catch(() => undefined);
  }
  res.status(201).json({ review });
});

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  reviewText: z.string().trim().min(10).max(2000).optional(),
});

reviewsRouter.patch("/:id", requireAuth, async (req, res) => {
  const body = parse(updateSchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!review) throw notFound("Review not found");
  if (review.userId !== currentUser(req).id) throw forbidden();
  const updated = await prisma.review.update({ where: { id: review.id }, data: body });
  await recalculateProvider(review.providerId);
  res.json({ review: updated });
});

reviewsRouter.delete("/:id", requireAuth, async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) } });
  if (!review) throw notFound("Review not found");
  const user = currentUser(req);
  if (review.userId !== user.id && user.role !== "super_admin") throw forbidden();
  await prisma.review.delete({ where: { id: review.id } });
  await recalculateProvider(review.providerId);
  res.json({ ok: true });
});

const reportSchema = z.object({ reason: z.string().trim().min(5).max(500) });

reviewsRouter.post("/:id/report", optionalAuth, async (req, res) => {
  const { reason } = parse(reportSchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: idParam(req.params.id as string) }, select: { id: true } });
  if (!review) throw notFound("Review not found");
  await prisma.reportFlag.create({ data: { reporterUserId: req.user?.id ?? null, targetType: "review", targetId: review.id, reason } });
  res.status(201).json({ ok: true });
});
