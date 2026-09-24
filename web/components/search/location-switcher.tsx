"use client";

import { useState } from "react";
import type { LocationOption } from "@/lib/types";
import { saveLocationCookie } from "@/lib/client";
import { LocationPicker } from "./location-picker";
import { useUrlParams } from "./use-url-params";

/** Location selector for listing pages: writes lat/lng/loc into the URL and remembers the choice. */
export function LocationSwitcher({ location }: { location: LocationOption }) {
  const { update } = useUrlParams();
  const [value, setValue] = useState(location);
  return (
    <div className="h-14 w-full rounded-xl border bg-card px-4 shadow-xs md:w-80">
      <LocationPicker
        value={value}
        triggerClassName="w-full"
        onChange={(next) => {
          setValue(next);
          saveLocationCookie(next);
          update({ lat: String(next.latitude), lng: String(next.longitude), loc: next.label });
        }}
      />
    </div>
  );
}
