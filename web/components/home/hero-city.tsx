"use client";

import { DEFAULT_LOCATION } from "@/lib/default-location";
import { useSavedLocation } from "@/lib/saved-location";

/** The visitor's city from their saved location; the default city while the cached page first renders. */
export function HeroCity() {
  const location = useSavedLocation();
  return <>{location?.city || location?.name || DEFAULT_LOCATION.city}</>;
}
