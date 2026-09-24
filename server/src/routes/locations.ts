import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";

export const locationsRouter = Router();

/**
 * GET /locations?q= — typeahead for the location selector. Built from the cities and service
 * areas already in the directory, so every suggestion has providers behind it. A geocoding API
 * can replace this later without changing the response shape.
 */
locationsRouter.get("/", async (req, res) => {
  const { q } = parse(z.object({ q: z.string().trim().max(80).default("") }), req.query);
  const like = `%${q}%`;
  const rows = await prisma.$queryRaw<{ label: string; city: string; state: string; lat: number; lng: number; kind: string; providers: bigint }[]>`
    WITH areas AS (
      SELECT a.area_name AS label, p.city, p.state,
             AVG(COALESCE(a.latitude, p.latitude))::float AS lat, AVG(COALESCE(a.longitude, p.longitude))::float AS lng,
             'area' AS kind, COUNT(DISTINCT p.id) AS providers
      FROM provider_service_areas a JOIN providers p ON p.id = a.provider_id AND p.status = 'active'
      WHERE ${q} = '' OR a.area_name ILIKE ${like} OR p.city ILIKE ${like}
      GROUP BY a.area_name, p.city, p.state
    ), cities AS (
      SELECT p.city AS label, p.city, p.state, AVG(p.latitude)::float AS lat, AVG(p.longitude)::float AS lng,
             'city' AS kind, COUNT(*) AS providers
      FROM providers p WHERE p.status = 'active' AND (${q} = '' OR p.city ILIKE ${like})
      GROUP BY p.city, p.state
    )
    SELECT * FROM (SELECT * FROM cities UNION ALL SELECT * FROM areas) x
    ORDER BY (kind = 'city') DESC, providers DESC LIMIT 12`;
  res.json({
    locations: rows.map((r) => ({
      label: r.kind === "city" ? `${r.label}, ${r.state}` : `${r.label}, ${r.city}`,
      name: r.label,
      city: r.city,
      state: r.state,
      kind: r.kind,
      latitude: Math.round(r.lat * 1e6) / 1e6,
      longitude: Math.round(r.lng * 1e6) / 1e6,
      providerCount: Number(r.providers),
    })),
  });
});
