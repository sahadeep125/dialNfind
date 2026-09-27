"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Captures one analytics event when a server-rendered page is shown (pages are cached, so this runs in the browser). */
export function TrackView({ event, properties }: { event: string; properties: Record<string, string | number | boolean | null> }) {
  const key = JSON.stringify(properties);
  useEffect(() => {
    track(event, JSON.parse(key) as Record<string, unknown>);
  }, [event, key]);
  return null;
}
