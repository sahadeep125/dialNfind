import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { notFound } from "../lib/errors.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { DAY_NAMES, formatHours, localNow } from "../lib/hours.js";
import { num } from "../lib/serialize.js";
import { optionalAuth } from "../middleware/auth.js";
import { providerCardInclude, toProviderCard } from "../services/presenter.js";
import { recordProfileView, searchProviders } from "../services/search.js";

export const providersRouter = Router();

const featuredSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

/** GET /providers/featured — top-ranked providers near the visitor, for the home page. */
providersRouter.get("/featured", optionalAuth, async (req, res) => {
  const params = parse(featuredSchema, req.query);
  const { results } = await searchProviders({
    lat: params.lat,
    lng: params.lng,
    city: params.city,
    radiusKm: 25,
    sort: "relevance",
    page: 1,
    pageSize: params.limit,
    userId: req.user?.id,
  });
  res.json({ results });
});

async function findActiveBySlug(slug: string) {
  const provider = await prisma.provider.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!provider || provider.status !== "active") throw notFound("Provider not found");
  return provider;
}

/** GET /providers/:slug — full public profile. */
providersRouter.get("/:slug", optionalAuth, async (req, res) => {
  const { id } = await findActiveBySlug(req.params.slug as string);
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id },
    include: {
      ...providerCardInclude,
      serviceAreas: { orderBy: { areaName: "asc" } },
      portfolio: { orderBy: { createdAt: "desc" }, include: { category: { select: { name: true } } } },
      verifications: { where: { status: "approved" }, select: { type: true, verifiedAt: true } },
    },
  });

  const [breakdownRows, favorite, myReview] = await Promise.all([
    prisma.review.groupBy({ by: ["rating"], where: { providerId: id, status: "published" }, _count: true }),
    req.user ? prisma.favorite.findUnique({ where: { userId_providerId: { userId: req.user.id, providerId: id } } }) : null,
    req.user ? prisma.review.findUnique({ where: { providerId_userId: { providerId: id, userId: req.user.id } } }) : null,
  ]);
  void recordProfileView(id);

  const { day } = localNow();
  const hours = DAY_NAMES.map((name, dayOfWeek) => {
    const row = provider.businessHours.find((h) => h.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      day: name,
      label: provider.businessHours.some((h) => h.is24x7) ? "Open 24 hours" : formatHours(row),
      openTime: row?.openTime ?? null,
      closeTime: row?.closeTime ?? null,
      isToday: dayOfWeek === day,
    };
  });

  const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: breakdownRows.find((r) => r.rating === rating)?._count ?? 0,
  }));

  res.json({
    provider: {
      ...toProviderCard(provider, { isFavorite: !!favorite }),
      description: provider.description,
      email: provider.email,
      website: provider.website,
      addressLine: provider.addressLine,
      pincode: provider.pincode,
      serviceRadiusKm: provider.serviceRadiusKm,
      selfReportedCompletedJobs: provider.selfReportedCompletedJobs,
      memberSince: provider.createdAt,
      hours,
      is24x7: provider.businessHours.some((h) => h.is24x7),
      serviceAreas: provider.serviceAreas.map((a) => ({ areaName: a.areaName, pincode: a.pincode })),
      services: provider.services.map((s) => ({
        id: s.id,
        category: s.category,
        subcategory: s.subcategory,
        startingPrice: num(s.startingPrice),
        priceUnit: s.priceUnit,
        isPrimary: s.isPrimary,
      })),
      portfolio: provider.portfolio.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        category: p.category?.name ?? null,
      })),
      verifications: provider.verifications,
      ratingBreakdown,
      myReview,
    },
  });
});

const reviewsQuery = paginationSchema.extend({
  sort: z.enum(["recent", "highest", "lowest"]).default("recent"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

/** GET /providers/:slug/reviews — published reviews, paged. */
providersRouter.get("/:slug/reviews", async (req, res) => {
  const { id } = await findActiveBySlug(req.params.slug as string);
  const q = parse(reviewsQuery, req.query);
  const where = { providerId: id, status: "published" as const, ...(q.rating ? { rating: q.rating } : {}) };
  const orderBy =
    q.sort === "highest"
      ? [{ rating: "desc" as const }, { createdAt: "desc" as const }]
      : q.sort === "lowest"
        ? [{ rating: "asc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { name: true, profilePhotoUrl: true } }, photos: true },
    }),
    prisma.review.count({ where }),
  ]);
  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      providerReply: r.providerReply,
      providerReplyAt: r.providerReplyAt,
      isVerifiedContact: r.leadId !== null,
      createdAt: r.createdAt,
      author: { name: r.user.name, photoUrl: r.user.profilePhotoUrl },
      photos: r.photos.map((p) => p.photoUrl),
    })),
    ...pageMeta(q.page, q.pageSize, total),
  });
});

/** GET /providers/:slug/similar — nearby providers in the same primary category. */
providersRouter.get("/:slug/similar", optionalAuth, async (req, res) => {
  const { id } = await findActiveBySlug(req.params.slug as string);
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id },
    include: { services: { include: { category: true }, orderBy: { isPrimary: "desc" }, take: 1 } },
  });
  const category = provider.services[0]?.category.slug;
  const { results } = await searchProviders({
    category,
    lat: num(provider.latitude) ?? undefined,
    lng: num(provider.longitude) ?? undefined,
    radiusKm: 20,
    sort: "relevance",
    page: 1,
    pageSize: 5,
    userId: req.user?.id,
  });
  res.json({ results: results.filter((r) => r.id !== id).slice(0, 4) });
});

const reportSchema = z.object({ reason: z.string().trim().min(5).max(500) });

providersRouter.post("/:slug/report", optionalAuth, async (req, res) => {
  const { id } = await findActiveBySlug(req.params.slug as string);
  const { reason } = parse(reportSchema, req.body);
  await prisma.reportFlag.create({ data: { reporterUserId: req.user?.id ?? null, targetType: "provider", targetId: id, reason } });
  res.status(201).json({ ok: true });
});
