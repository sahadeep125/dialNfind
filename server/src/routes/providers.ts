import { Router } from "express";
import { displayAttributeValue, loadAttributeValues } from "../services/attributes.js";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { notFound } from "../lib/errors.js";
import { pageMeta, paginationSchema } from "../lib/pagination.js";
import { DAY_NAMES, formatHours, localNow } from "../lib/hours.js";
import { num } from "../lib/serialize.js";
import { optionalAuth, type AuthUser } from "../middleware/auth.js";
import { ownReview, publicEligibility, reviewEligibility } from "../services/review-trust.js";
import { providerCardInclude, toProviderCard } from "../services/presenter.js";
import { recordProfileView, searchProviders } from "../services/search.js";
import { limits } from "../lib/rate-limit.js";
import { verifyPreviewToken } from "../lib/jwt.js";
import { photoAltText, providerSeo } from "../services/seo.js";
import { professionLabel, serviceAreaLabel } from "../services/professions.js";

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

const sitemapSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50000).default(45000),
});

/** GET /providers/sitemap — every live listing search engines may show (not hidden by the team), for the website's sitemap. */
providersRouter.get("/sitemap", async (req, res) => {
  const q = parse(sitemapSchema, req.query);
  const where = { status: "active" as const, seoNoIndex: false };
  const [rows, total] = await Promise.all([
    prisma.provider.findMany({ where, orderBy: { id: "asc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, select: { slug: true, updatedAt: true } }),
    prisma.provider.count({ where }),
  ]);
  res.json({ results: rows, ...pageMeta(q.page, q.pageSize, total) });
});

/** A live listing, or any listing when `previewToken` was issued for it (see signPreviewToken). */
async function findActiveBySlug(slug: string, previewToken?: unknown) {
  const provider = await prisma.provider.findUnique({ where: { slug }, select: { id: true, status: true, userId: true } });
  const previewing = !!provider && typeof previewToken === "string" && verifyPreviewToken(previewToken) === provider.id;
  if (!provider || (provider.status !== "active" && !previewing)) throw notFound("Provider not found");
  return provider;
}

/**
 * The visitor's own review of a business, or whether they may write one. The apps only show
 * "Write a review" when `reviewEligibility.canReview` is true.
 */
async function viewerReview(user: AuthUser | undefined, provider: { id: bigint; userId: bigint | null }) {
  const review = user
    ? await prisma.review.findUnique({ where: { providerId_userId: { providerId: provider.id, userId: user.id } }, include: { photos: { select: { photoUrl: true } } } })
    : null;
  if (review) return { myReview: ownReview(review), reviewEligibility: null };
  return { myReview: null, reviewEligibility: publicEligibility(await reviewEligibility(user, provider)) };
}

/** GET /providers/:slug — full public profile. With ?previewToken=, also a listing that is not live yet. */
providersRouter.get("/:slug", optionalAuth, async (req, res) => {
  const found = await findActiveBySlug(req.params.slug as string, req.query.previewToken);
  const { id, status } = found;
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id },
    include: {
      ...providerCardInclude,
      serviceAreas: { orderBy: { areaName: "asc" } },
      portfolio: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }], include: { category: { select: { name: true } } } },
      verifications: { where: { status: "approved" }, select: { type: true, verifiedAt: true } },
    },
  });

  const [breakdownRows, favorite, { myReview, reviewEligibility }, otherListings] = await Promise.all([
    prisma.review.groupBy({ by: ["rating"], where: { providerId: id, status: "published" }, _count: true }),
    req.user ? prisma.favorite.findUnique({ where: { userId_providerId: { userId: req.user.id, providerId: id } } }) : null,
    viewerReview(req.user, found),
    // An individual professional's other professions, each its own listing.
    provider.userId && provider.businessType === "individual"
      ? prisma.provider.findMany({
          where: { userId: provider.userId, id: { not: id }, status: "active", businessType: "individual" },
          orderBy: { id: "asc" },
          take: 10,
          include: { services: providerCardInclude.services },
        })
      : [],
  ]);
  // The website renders profiles from a shared cache and counts each visit with /visit instead.
  if (req.query.view !== "false") void recordProfileView(id);

  const [serviceValues, seo] = await Promise.all([loadAttributeValues(prisma, "provider_service", provider.services.map((s) => s.id)), providerSeo(id)]);
  const { service } = seo;
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
        details: (serviceValues.get(s.id) ?? []).map((v) => ({ label: v.attribute.label, value: displayAttributeValue(v.attribute, v.value) })),
      })),
      portfolio: provider.portfolio.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        // The title plus the business and city when it lacks them, so image search knows what and where.
        altText: photoAltText(p.title, { name: provider.businessName, service, city: provider.city }),
        category: p.category?.name ?? null,
      })),
      // Answers to the category's provider questions, one line per question.
      serviceDetails: [...serviceValues.values()]
        .flat()
        .filter((v, i, all) => all.findIndex((x) => x.attribute.id === v.attribute.id) === i)
        .map((v) => ({ label: v.attribute.label, value: displayAttributeValue(v.attribute, v.value) })),
      verifications: provider.verifications,
      otherListings: otherListings.map((o) => {
        // Services come primary first (providerCardInclude).
        return { slug: o.slug, profession: professionLabel(o, o.services[0]), serviceAreaLabel: serviceAreaLabel(o) };
      }),
      // What the website puts in <head>: the same title and description the provider sees in their SEO page.
      seo: {
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        focusKeyword: seo.focusKeyword,
        service,
        noIndex: provider.seoNoIndex,
      },
      status,
      ratingBreakdown,
      myReview,
      reviewEligibility,
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

providersRouter.post("/:slug/report", limits.reviews, optionalAuth, async (req, res) => {
  const { id } = await findActiveBySlug(req.params.slug as string);
  const { reason } = parse(reportSchema, req.body);
  await prisma.reportFlag.create({ data: { reporterUserId: req.user?.id ?? null, targetType: "provider", targetId: id, reason } });
  res.status(201).json({ ok: true });
});

/**
 * POST /providers/:slug/visit — counts a profile view and returns what is personal to the visitor
 * (favorite, their review), so the profile itself can be served from a shared cache.
 */
providersRouter.post("/:slug/visit", optionalAuth, async (req, res) => {
  const provider = await findActiveBySlug(req.params.slug as string);
  const { id } = provider;
  void recordProfileView(id);
  const [favorite, review] = await Promise.all([
    req.user ? prisma.favorite.findUnique({ where: { userId_providerId: { userId: req.user.id, providerId: id } } }) : null,
    viewerReview(req.user, provider),
  ]);
  res.json({ isFavorite: !!favorite, ...review });
});
