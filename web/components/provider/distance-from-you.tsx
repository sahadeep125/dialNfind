"use client";

import { useState, useSyncExternalStore } from "react";
import { LocateFixed, Navigation } from "lucide-react";
import { LOCATION_COOKIE } from "@/lib/config";
import { saveLocationCookie } from "@/lib/client";
import { readSavedLocation } from "@/lib/saved-location";
import type { LocationOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatKm, kmBetween } from "@/lib/format";

const subscribe = () => () => undefined;
const hasCookie = () => document.cookie.split("; ").some((c) => c.startsWith(`${LOCATION_COOKIE}=`));

/**
 * How far this professional is from the visitor. Uses the area the visitor picked earlier; otherwise offers a
 * one-tap "distance from me" that asks for the browser's location. Profiles are cached for everyone, so this
 * only renders in the browser.
 */
export function DistanceFromYou({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const saved = useSyncExternalStore(subscribe, hasCookie, () => null);
  const [here, setHere] = useState<LocationOption | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "failed">("idle");

  if (saved === null) return null;
  const from = here ?? (saved ? readSavedLocation() : null);

  if (from) {
    const km = kmBetween({ lat: from.latitude, lng: from.longitude }, { lat, lng });
    const label = from.kind === "current" ? "you" : from.name || from.label;
    return (
      <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
        <Navigation className="size-4 shrink-0 text-cta-strong" aria-hidden />
        <span>
          <strong className="font-semibold">{formatKm(km)}</strong> <span className="text-muted-foreground">from {label}</span>
        </span>
      </span>
    );
  }

  if (state === "failed") return null;
  return (
    <button
      type="button"
      disabled={state === "locating"}
      onClick={() => {
        if (!navigator.geolocation) return setState("failed");
        setState("locating");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const location: LocationOption = {
              label: "Current location",
              name: "Current location",
              city: "",
              state: "",
              kind: "current",
              latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
              longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
            };
            saveLocationCookie(location);
            setHere(location);
            setState("idle");
          },
          () => setState("failed"),
          { enableHighAccuracy: false, timeout: 8000 },
        );
      }}
      className={cn("inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60", className)}
    >
      <LocateFixed className="size-4 shrink-0" aria-hidden />
      {state === "locating" ? "Finding you…" : "How far is this from me?"}
    </button>
  );
}
