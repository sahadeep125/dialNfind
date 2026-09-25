import { Prisma } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

/** A place found by the geocoder, in the same shape as the directory's own location options. */
export interface Place {
  label: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  pincode: string | null;
}

const CACHE_DAYS = 30;
const MIN_GAP_MS = 1100; // Nominatim allows one request per second from an application.
const TIMEOUT_MS = 5000;
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

/** Runs requests one after another with at least MIN_GAP_MS between them. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = next.catch(() => undefined);
  return next;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

function toPlace(r: NominatimResult): Place | null {
  const a = r.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.state_district ?? a.county ?? "";
  const name = r.name || a.suburb || a.neighbourhood || a.quarter || a.road || city;
  const latitude = Number(r.lat);
  const longitude = Number(r.lon);
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name,
    city,
    state: a.state ?? "",
    label: city && name !== city ? `${name}, ${city}` : [name, a.state].filter(Boolean).join(", "),
    latitude: Math.round(latitude * 1e6) / 1e6,
    longitude: Math.round(longitude * 1e6) / 1e6,
    pincode: a.postcode ?? null,
  };
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await prisma.geocodeCache.findUnique({ where: { key } });
  if (hit && Date.now() - hit.createdAt.getTime() < CACHE_DAYS * 24 * 60 * 60 * 1000) return hit.result as T;
  const value = await load();
  await prisma.geocodeCache
    .upsert({ where: { key }, create: { key, result: value as Prisma.InputJsonValue }, update: { result: value as Prisma.InputJsonValue, createdAt: new Date() } })
    .catch(() => undefined);
  return value;
}

async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${env.geocoder.url}${path}?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "en", ...params })}`;
  return throttled(async () => {
    const res = await fetch(url, { headers: { "User-Agent": env.geocoder.userAgent, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Geocoder answered ${res.status}`);
    return (await res.json()) as T;
  });
}

/** Places matching free text (a town, locality or address). Returns [] when the geocoder is off or unreachable. */
export async function searchPlaces(query: string, limit = 5): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, " ");
  if (!env.geocoder.enabled || q.length < 3) return [];
  try {
    return await cached(`search:${env.geocoder.country}:${q.toLowerCase()}:${limit}`, async () => {
      const rows = await nominatim<NominatimResult[]>("/search", { q, limit: String(limit), ...(env.geocoder.country ? { countrycodes: env.geocoder.country } : {}) });
      return rows.map(toPlace).filter((p): p is Place => p !== null);
    });
  } catch (err) {
    console.warn("[geocode] search failed", (err as Error).message);
    return [];
  }
}

/** The area around a point, for "Use my location". Null when unknown or the geocoder is unreachable. */
export async function reversePlace(latitude: number, longitude: number): Promise<Place | null> {
  if (!env.geocoder.enabled) return null;
  // About 100 m of rounding, so nearby taps share a cache entry.
  const lat = latitude.toFixed(3);
  const lon = longitude.toFixed(3);
  try {
    return await cached(`reverse:${lat},${lon}`, async () => {
      const row = await nominatim<NominatimResult & { error?: string }>("/reverse", { lat, lon, zoom: "16" });
      return row.error ? null : toPlace(row);
    });
  } catch (err) {
    console.warn("[geocode] reverse failed", (err as Error).message);
    return null;
  }
}

/** Deletes cache entries older than CACHE_DAYS; run by the nightly cleanup job. */
export async function purgeGeocodeCache(): Promise<number> {
  const { count } = await prisma.geocodeCache.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000) } } });
  return count;
}
