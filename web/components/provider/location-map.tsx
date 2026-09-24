"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Map = dynamic(() => import("./location-map-inner"), { ssr: false, loading: () => <Skeleton className="size-full" /> });

export function LocationMap(props: { lat: number; lng: number; radiusKm: number; label: string }) {
  return <Map {...props} />;
}
