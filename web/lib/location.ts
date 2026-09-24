import "server-only";
import { getSavedLocation } from "./session";
import type { LocationOption } from "./types";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Location from the URL (lat/lng/loc) if present, otherwise the visitor's saved location. */
export async function resolveLocation(searchParams: SP): Promise<LocationOption> {
  const latRaw = one(searchParams.lat);
  const lngRaw = one(searchParams.lng);
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (latRaw && lngRaw && Number.isFinite(lat) && Number.isFinite(lng)) {
    const label = one(searchParams.loc) ?? "Selected location";
    return { label, name: label.split(",")[0], city: "", state: "", kind: "area", latitude: lat, longitude: lng };
  }
  return getSavedLocation();
}
