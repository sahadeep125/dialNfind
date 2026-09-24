"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";

const icon = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" style="filter:drop-shadow(0 4px 6px rgb(30 30 80 / .3))"><path d="M17 43C8 32 2 25 2 16a15 15 0 0 1 30 0c0 9-6 16-15 27Z" fill="oklch(0.53 0.2 266)" stroke="white" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="white"/></svg>`,
});

export default function LocationMapInner({ lat, lng, radiusKm, label }: { lat: number; lng: number; radiusKm: number; label: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle center={[lat, lng]} radius={radiusKm * 1000} pathOptions={{ color: "oklch(0.53 0.2 266)", weight: 1, fillOpacity: 0.06 }} />
      <Marker position={[lat, lng]} icon={icon} title={label} />
    </MapContainer>
  );
}
