import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { reversePlace, searchPlaces } from "../services/geocode.js";

export const locationsRouter = Router();

const MAX_RESULTS = 12;

/**
 * GET /locations?q= — typeahead for the location selector. Cities and service areas already in the
 * directory come first (each has providers behind it); for 3+ characters the rest is filled with
 * places from the geocoder, so a customer or a new business in a town we do not cover yet still
 * finds it. Places carry kind "place" and providerCount 0.
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
    ORDER BY (kind = 'city') DESC, providers DESC LIMIT ${MAX_RESULTS}`;
  const locations = rows.map((r) => ({
    label: r.kind === "city" ? `${r.label}, ${r.state}` : `${r.label}, ${r.city}`,
    name: r.label,
    city: r.city,
    state: r.state,
    kind: r.kind,
    latitude: Math.round(r.lat * 1e6) / 1e6,
    longitude: Math.round(r.lng * 1e6) / 1e6,
    providerCount: Number(r.providers),
  }));

  if (q.length >= 3 && locations.length < MAX_RESULTS) {
    const known = new Set(locations.map((l) => l.name.toLowerCase()));
    for (const place of await searchPlaces(q, 5)) {
      if (locations.length >= MAX_RESULTS || known.has(place.name.toLowerCase())) continue;
      known.add(place.name.toLowerCase());
      locations.push({ label: place.label, name: place.name, city: place.city, state: place.state, kind: "place", latitude: place.latitude, longitude: place.longitude, providerCount: 0 });
    }
  }
  res.json({ locations });
});

/** GET /locations/reverse?lat=&lng= — names the area around a point, for "Use my location". */
locationsRouter.get("/reverse", async (req, res) => {
  const { lat, lng } = parse(z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }), req.query);
  const place = await reversePlace(lat, lng);
  res.json({
    location: place
      ? { label: place.label, name: place.name, city: place.city, state: place.state, kind: "current", latitude: lat, longitude: lng }
      : { label: "Current location", name: "Current location", city: "", state: "", kind: "current", latitude: lat, longitude: lng },
  });
});
