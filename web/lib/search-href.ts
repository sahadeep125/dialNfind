import type { LocationOption } from "./types";

export function buildSearchHref(q: string, location: LocationOption, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ ...extra });
  if (q) params.set("q", q);
  params.set("lat", String(location.latitude));
  params.set("lng", String(location.longitude));
  params.set("loc", location.label);
  return `/search?${params.toString()}`;
}
