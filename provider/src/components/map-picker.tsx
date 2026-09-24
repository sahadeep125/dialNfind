import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const icon = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" style="filter:drop-shadow(0 4px 6px rgb(30 30 80 / .3))"><path d="M17 43C8 32 2 25 2 16a15 15 0 0 1 30 0c0 9-6 16-15 27Z" fill="oklch(0.53 0.2 266)" stroke="white" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="white"/></svg>`,
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function ClickToMove({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(round(e.latlng.lat), round(e.latlng.lng)) });
  return null;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Drag the pin or click the map to set the exact business location. */
export function MapPicker({ lat, lng, radiusKm, onChange }: { lat: number; lng: number; radiusKm?: number; onChange: (lat: number, lng: number) => void }) {
  const handlers = useMemo(
    () => ({
      dragend(e: L.LeafletEvent) {
        const p = (e.target as L.Marker).getLatLng();
        onChange(round(p.lat), round(p.lng));
      },
    }),
    [onChange],
  );
  return (
    <MapContainer center={[lat, lng]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter lat={lat} lng={lng} />
      <ClickToMove onChange={onChange} />
      {radiusKm && <Circle center={[lat, lng]} radius={radiusKm * 1000} pathOptions={{ color: "oklch(0.53 0.2 266)", weight: 1, fillOpacity: 0.06 }} />}
      <Marker position={[lat, lng]} icon={icon} draggable eventHandlers={handlers} />
    </MapContainer>
  );
}
