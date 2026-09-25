import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { localNow } from "../lib/hours.js";
import { providerCardInclude, toProviderCard } from "./presenter.js";
import { getNumberSetting } from "./settings.js";

export type SortKey = "relevance" | "distance" | "rating" | "reviews";

/** Nobody is shown further away than this, whatever their travel distance or service areas. */
const MAX_REACH_KM = 100;

export interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
  area?: string;
  minRating?: number;
  openNow?: boolean;
  verified?: boolean;
  sort: SortKey;
  page: number;
  pageSize: number;
  userId?: bigint;
}

export interface ResolvedTerm {
  category: { id: bigint; name: string; slug: string } | null;
  subcategory: { id: bigint; name: string; slug: string; categoryId: bigint } | null;
}

/**
 * Maps free text like "tv not working" or "TV Repair" onto a subcategory or category, using
 * substring matches first and trigram similarity as a fallback.
 */
export async function resolveTerm(q: string): Promise<ResolvedTerm> {
  const term = q.trim();
  if (!term) return { category: null, subcategory: null };

  const subs = await prisma.$queryRaw<{ id: bigint; name: string; slug: string; category_id: bigint; score: number }[]>`
    SELECT id, name, slug, category_id,
      GREATEST(similarity(name, ${term}), CASE WHEN ${term} ILIKE '%' || name || '%' OR name ILIKE '%' || ${term} || '%' THEN 0.9 ELSE 0 END) AS score
    FROM subcategories WHERE is_active
    ORDER BY score DESC LIMIT 1`;
  const cats = await prisma.$queryRaw<{ id: bigint; name: string; slug: string; score: number }[]>`
    SELECT id, name, slug,
      GREATEST(similarity(name, ${term}), CASE WHEN ${term} ILIKE '%' || name || '%' OR name ILIKE '%' || ${term} || '%' THEN 0.85 ELSE 0 END) AS score
    FROM categories WHERE is_active
    ORDER BY score DESC LIMIT 1`;

  const sub = subs[0] && subs[0].score >= 0.35 ? subs[0] : null;
  const cat = cats[0] && cats[0].score >= 0.35 ? cats[0] : null;

  if (sub && (!cat || sub.score >= cat.score)) {
    const parent = await prisma.category.findUnique({ where: { id: sub.category_id }, select: { id: true, name: true, slug: true } });
    return { category: parent, subcategory: { id: sub.id, name: sub.name, slug: sub.slug, categoryId: sub.category_id } };
  }
  if (cat) return { category: { id: cat.id, name: cat.name, slug: cat.slug }, subcategory: null };
  return { category: null, subcategory: null };
}

export async function searchProviders(params: SearchParams) {
  const { sort, page, pageSize } = params;
  const hasOrigin = params.lat !== undefined && params.lng !== undefined;
  const radiusKm = params.radiusKm ?? (await getNumberSetting("default_search_radius_km", 15));

  let categoryId: bigint | null = null;
  let subcategoryId: bigint | null = null;
  let resolved: ResolvedTerm = { category: null, subcategory: null };

  if (params.subcategory) {
    const sub = await prisma.subcategory.findUnique({ where: { slug: params.subcategory }, include: { category: true } });
    if (sub) {
      subcategoryId = sub.id;
      categoryId = sub.categoryId;
      resolved = {
        category: { id: sub.category.id, name: sub.category.name, slug: sub.category.slug },
        subcategory: { id: sub.id, name: sub.name, slug: sub.slug, categoryId: sub.categoryId },
      };
    }
  } else if (params.category) {
    const cat = await prisma.category.findUnique({ where: { slug: params.category } });
    if (cat) {
      categoryId = cat.id;
      resolved = { category: { id: cat.id, name: cat.name, slug: cat.slug }, subcategory: null };
    }
  }

  const q = params.q?.trim() ?? "";
  let applyTextFilter = false;
  if (q) {
    if (categoryId) {
      // Explicit category from the URL: narrow within it by the typed text.
      applyTextFilter = true;
    } else {
      resolved = await resolveTerm(q);
      if (resolved.subcategory) subcategoryId = resolved.subcategory.id;
      if (resolved.category) categoryId = resolved.category.id;
      applyTextFilter = !resolved.category;
    }
  }

  const where: Prisma.Sql[] = [Prisma.sql`p.status = 'active'`];
  const origin = hasOrigin
    ? Prisma.sql`ST_SetSRID(ST_MakePoint(${params.lng}::double precision, ${params.lat}::double precision), 4326)::geography`
    : null;

  if (subcategoryId) {
    where.push(Prisma.sql`EXISTS (SELECT 1 FROM provider_services ps WHERE ps.provider_id = p.id AND ps.subcategory_id = ${subcategoryId})`);
  } else if (categoryId) {
    where.push(Prisma.sql`EXISTS (SELECT 1 FROM provider_services ps WHERE ps.provider_id = p.id AND ps.category_id = ${categoryId})`);
  }

  if (applyTextFilter) {
    const like = `%${q}%`;
    where.push(Prisma.sql`(
      p.business_name ILIKE ${like} OR p.description ILIKE ${like} OR similarity(p.business_name, ${q}) > 0.3
      OR EXISTS (
        SELECT 1 FROM provider_services ps
        JOIN categories c ON c.id = ps.category_id
        LEFT JOIN subcategories s ON s.id = ps.subcategory_id
        WHERE ps.provider_id = p.id AND (c.name ILIKE ${like} OR s.name ILIKE ${like})
      )
    )`);
  }

  if (origin) {
    // A provider matches when they are within the search radius, when a locality they serve is, or, when
    // the customer did not pick a radius themselves, when the customer is within the distance the
    // provider travels. The first check keeps the GiST index in play before the per-row ones.
    const radiusM = radiusKm * 1000;
    const servedArea = Prisma.sql`EXISTS (
      SELECT 1 FROM provider_service_areas a
      WHERE a.provider_id = p.id AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        AND ST_DWithin(ST_SetSRID(ST_MakePoint(a.longitude::double precision, a.latitude::double precision), 4326)::geography, ${origin}, ${radiusM})
    )`;
    const travels = params.radiusKm === undefined ? Prisma.sql`OR ST_DWithin(p.location, ${origin}, p.service_radius_km * 1000)` : Prisma.empty;
    where.push(Prisma.sql`ST_DWithin(p.location, ${origin}, ${Math.max(radiusM, MAX_REACH_KM * 1000)})`);
    where.push(Prisma.sql`(ST_DWithin(p.location, ${origin}, ${radiusM}) ${travels} OR ${servedArea})`);
  } else if (params.city) {
    where.push(Prisma.sql`p.city ILIKE ${params.city}`);
  }
  if (params.area) {
    const like = `%${params.area}%`;
    where.push(Prisma.sql`(p.locality ILIKE ${like} OR EXISTS (SELECT 1 FROM provider_service_areas a WHERE a.provider_id = p.id AND a.area_name ILIKE ${like}))`);
  }
  if (params.minRating) where.push(Prisma.sql`p.avg_rating >= ${params.minRating}`);
  if (params.verified) where.push(Prisma.sql`p.verification_status = 'verified'`);
  if (params.openNow) {
    const { day, time } = localNow();
    const yesterday = (day + 6) % 7;
    where.push(Prisma.sql`p.is_available AND EXISTS (
      SELECT 1 FROM provider_business_hours h WHERE h.provider_id = p.id AND (
        h.is_24x7
        OR (h.day_of_week = ${day} AND h.open_time IS NOT NULL AND (
              (h.close_time > h.open_time AND ${time} >= h.open_time AND ${time} < h.close_time)
           OR (h.close_time < h.open_time AND ${time} >= h.open_time)))
        OR (h.day_of_week = ${yesterday} AND h.close_time < h.open_time AND ${time} < h.close_time)
      )
    )`);
  }

  const distanceExpr = origin ? Prisma.sql`ST_Distance(p.location, ${origin}) / 1000.0` : Prisma.sql`NULL::double precision`;
  // Relevance blends the cached ranking score with a gentle distance decay.
  const relevanceExpr = origin
    ? Prisma.sql`p.ranking_score * (1.0 / (1.0 + (ST_Distance(p.location, ${origin}) / 1000.0) / 8.0)) + CASE WHEN p.is_available THEN 2 ELSE 0 END`
    : Prisma.sql`p.ranking_score + CASE WHEN p.is_available THEN 2 ELSE 0 END`;

  const orderBy = {
    relevance: Prisma.sql`relevance DESC, p.id ASC`,
    distance: origin ? Prisma.sql`distance_km ASC NULLS LAST, p.id ASC` : Prisma.sql`relevance DESC, p.id ASC`,
    rating: Prisma.sql`p.avg_rating DESC, p.total_reviews DESC, p.id ASC`,
    reviews: Prisma.sql`p.total_reviews DESC, p.avg_rating DESC, p.id ASC`,
  }[sort];

  const whereSql = Prisma.join(where, " AND ");
  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: bigint; distance_km: number | null }[]>`
      SELECT p.id, ${distanceExpr} AS distance_km, ${relevanceExpr} AS relevance
      FROM providers p
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM providers p WHERE ${whereSql}`,
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  const ids = rows.map((r) => r.id);

  const [providers, favorites, sponsored] = await Promise.all([
    prisma.provider.findMany({ where: { id: { in: ids } }, include: providerCardInclude }),
    params.userId && ids.length
      ? prisma.favorite.findMany({ where: { userId: params.userId, providerId: { in: ids } }, select: { providerId: true } })
      : Promise.resolve([]),
    categoryId && ids.length
      ? prisma.sponsoredListing.findMany({
          where: { providerId: { in: ids }, categoryId, status: "active", startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          select: { id: true, providerId: true },
        })
      : Promise.resolve([]),
  ]);
  const byId = new Map(providers.map((p) => [p.id, p]));
  const favSet = new Set(favorites.map((f) => f.providerId));
  const sponsoredSet = new Set(sponsored.map((s) => s.providerId));
  if (sponsored.length) {
    void prisma.sponsoredListing
      .updateMany({ where: { id: { in: sponsored.map((s) => s.id) } }, data: { impressions: { increment: 1 } } })
      .catch(() => undefined);
  }

  const results = rows
    .map((r) => {
      const p = byId.get(r.id);
      if (!p) return null;
      return toProviderCard(p, {
        distanceKm: r.distance_km === null ? null : Number(r.distance_km),
        isFavorite: favSet.has(p.id),
        isSponsored: sponsoredSet.has(p.id),
      });
    })
    .filter((r) => r !== null);

  if (ids.length) void recordImpressions(ids);

  return {
    results,
    total,
    radiusKm,
    resolved: {
      category: resolved.category,
      subcategory: resolved.subcategory ? { id: resolved.subcategory.id, name: resolved.subcategory.name, slug: resolved.subcategory.slug } : null,
    },
  };
}

async function recordImpressions(ids: bigint[]) {
  try {
    const values = Prisma.join(ids.map((id) => Prisma.sql`(${id}, CURRENT_DATE, 1)`));
    await prisma.$executeRaw`
      INSERT INTO provider_daily_stats (provider_id, date, search_impressions)
      VALUES ${values}
      ON CONFLICT (provider_id, date) DO UPDATE SET search_impressions = provider_daily_stats.search_impressions + 1`;
  } catch (err) {
    console.warn("Failed to record impressions", err);
  }
}

export async function recordProfileView(providerId: bigint) {
  try {
    await prisma.$executeRaw`
      INSERT INTO provider_daily_stats (provider_id, date, profile_views)
      VALUES (${providerId}, CURRENT_DATE, 1)
      ON CONFLICT (provider_id, date) DO UPDATE SET profile_views = provider_daily_stats.profile_views + 1`;
  } catch (err) {
    console.warn("Failed to record profile view", err);
  }
}
