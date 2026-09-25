import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { pageMeta } from "../lib/pagination.js";
import { optionalAuth } from "../middleware/auth.js";
import { searchProviders } from "../services/search.js";

export const searchRouter = Router();

const bool = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1")
  .optional();

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional(),
  city: z.string().trim().max(60).optional(),
  area: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openNow: bool,
  verified: bool,
  sort: z.enum(["relevance", "distance", "rating", "reviews"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  log: bool,
});

/** GET /search/providers — the core directory search used by listing and search pages. */
searchRouter.get("/providers", optionalAuth, async (req, res) => {
  const params = parse(searchSchema, req.query);
  const { results, total, resolved, radiusKm } = await searchProviders({ ...params, userId: req.user?.id });

  if (params.q && params.log !== false && params.page === 1) {
    void prisma.searchQuery
      .create({
        data: {
          userId: req.user?.id ?? null,
          rawQuery: params.q,
          parsedCategoryId: resolved.category?.id ?? null,
          parsedSubcategoryId: resolved.subcategory?.id ?? null,
          parsedLocationText: params.location ?? params.area ?? params.city ?? null,
          latitude: params.lat,
          longitude: params.lng,
          resultsCount: total,
        },
      })
      .catch((err) => console.warn("Failed to log search", err));
  }

  res.json({ results, resolved, radiusKm, ...pageMeta(params.page, params.pageSize, total) });
});

const suggestSchema = z.object({ q: z.string().trim().min(1).max(80) });

/** GET /search/suggest — autocomplete across subcategories, categories and business names. */
searchRouter.get("/suggest", async (req, res) => {
  const { q } = parse(suggestSchema, req.query);
  const like = `%${q}%`;
  const [subcategories, categories, providers] = await Promise.all([
    prisma.$queryRaw<{ name: string; slug: string; category_slug: string; category_name: string }[]>`
      SELECT s.name, s.slug, c.slug AS category_slug, c.name AS category_name
      FROM subcategories s JOIN categories c ON c.id = s.category_id
      WHERE s.is_active AND c.is_active AND (s.name ILIKE ${like} OR similarity(s.name, ${q}) > 0.25)
      ORDER BY (s.name ILIKE ${q + "%"}) DESC, similarity(s.name, ${q}) DESC LIMIT 6`,
    prisma.$queryRaw<{ name: string; slug: string }[]>`
      SELECT name, slug FROM categories
      WHERE is_active AND (name ILIKE ${like} OR similarity(name, ${q}) > 0.25)
      ORDER BY similarity(name, ${q}) DESC LIMIT 4`,
    prisma.$queryRaw<{ business_name: string; slug: string; city: string }[]>`
      SELECT business_name, slug, city FROM providers
      WHERE status = 'active' AND (business_name ILIKE ${like} OR similarity(business_name, ${q}) > 0.3)
      ORDER BY similarity(business_name, ${q}) DESC, ranking_score DESC LIMIT 5`,
  ]);
  res.json({
    suggestions: [
      ...subcategories.map((s) => ({ type: "service" as const, label: s.name, slug: s.slug, categorySlug: s.category_slug, context: s.category_name })),
      ...categories.map((c) => ({ type: "category" as const, label: c.name, slug: c.slug })),
      ...providers.map((p) => ({ type: "provider" as const, label: p.business_name, slug: p.slug, context: p.city })),
    ],
  });
});

/** GET /search/popular — most searched terms over the last 30 days, for the home page. */
searchRouter.get("/popular", async (_req, res) => {
  const rows = await prisma.$queryRaw<{ term: string; count: bigint }[]>`
    SELECT MODE() WITHIN GROUP (ORDER BY raw_query) AS term, COUNT(*)::bigint AS count FROM search_queries
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY LOWER(raw_query) ORDER BY count DESC LIMIT 8`;
  res.json({ terms: rows.map((r) => ({ term: r.term, count: Number(r.count) })) });
});
