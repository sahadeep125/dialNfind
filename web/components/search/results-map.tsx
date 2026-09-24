"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle } from "react-leaflet";
import Link from "next/link";
import type { ProviderCard } from "@/lib/types";
import { formatDistance } from "@/lib/format";

function pinIcon(rating: number, active: boolean) {
  const bg = active ? "oklch(0.45 0.19 270)" : "oklch(0.53 0.2 266)";
  return L.divIcon({
    className: "",
    iconSize: [44, 30],
    iconAnchor: [22, 30],
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 6px rgb(30 30 80 / .25))">
      <div style="background:${bg};color:white;font:700 12px/1 Inter,system-ui;padding:5px 8px;border-radius:999px;border:2px solid white;white-space:nowrap">${rating ? rating.toFixed(1) + " &#9733;" : "New"}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg};margin-top:-1px"></div>
    </div>`,
  });
}

const originIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:999px;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px oklch(0.53 0.2 266 / .18)"><div style="width:12px;height:12px;border-radius:999px;background:oklch(0.53 0.2 266)"></div></div>`,
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function ResultsMap({
  providers,
  origin,
  radiusKm,
  className,
}: {
  providers: ProviderCard[];
  origin: { lat: number; lng: number } | null;
  radiusKm?: number;
  className?: string;
}) {
  const points = useMemo(() => {
    const pts: [number, number][] = providers.map((p) => [p.latitude, p.longitude]);
    if (origin) pts.push([origin.lat, origin.lng]);
    return pts;
  }, [providers, origin]);
  const center: [number, number] = origin ? [origin.lat, origin.lng] : points[0] ?? [26.734, 88.433];

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {origin && (
        <>
          <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
          {radiusKm && <Circle center={[origin.lat, origin.lng]} radius={radiusKm * 1000} pathOptions={{ color: "oklch(0.53 0.2 266)", weight: 1, fillOpacity: 0.04, dashArray: "4 6" }} />}
        </>
      )}
      {providers.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon(p.avgRating, false)}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <Link href={`/providers/${p.slug}`} style={{ fontWeight: 700, fontSize: 14, color: "oklch(0.27 0.09 268)" }}>
                {p.businessName}
              </Link>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {p.primaryCategory?.name}
                {p.distanceKm !== null ? ` · ${formatDistance(p.distanceKm)}` : ""}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {p.totalReviews ? `${p.avgRating.toFixed(1)} stars · ${p.totalReviews} reviews` : "New listing"} · {p.isOpenNow ? "Open now" : "Closed"}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
