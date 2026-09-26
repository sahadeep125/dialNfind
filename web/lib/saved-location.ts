"use client";

import { useMemo, useSyncExternalStore } from "react";
import { LOCATION_COOKIE } from "./config";
import { DEFAULT_LOCATION } from "./default-location";
import type { LocationOption } from "./types";

function rawCookie(): string | null {
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${LOCATION_COOKIE}=`))
      ?.slice(LOCATION_COOKIE.length + 1) ?? null
  );
}

function parse(raw: string | null): LocationOption {
  if (!raw) return DEFAULT_LOCATION;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as LocationOption;
    if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") return parsed;
  } catch {
    /* fall through */
  }
  return DEFAULT_LOCATION;
}

/** The location the visitor last chose (saved by saveLocationCookie), or the default area. */
export function readSavedLocation(): LocationOption {
  return parse(rawCookie());
}

// The cookie changes only through saveLocationCookie, which reloads or navigates, so nothing to subscribe to.
const subscribe = () => () => undefined;

/** Null while rendering on the server (pages are cached and have no cookie), then the saved location. */
export function useSavedLocation(): LocationOption | null {
  const raw = useSyncExternalStore(subscribe, rawCookie, () => undefined);
  return useMemo(() => (raw === undefined ? null : parse(raw)), [raw]);
}
