import type { Address, LocationOption } from "@/types";

/** The API sends coordinates as decimal strings; the app works with numbers. */
export function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A saved address as a search location, or null when it has no coordinates to search around. */
export function addressToLocation(address: Address): LocationOption | null {
  if (address.latitude === null || address.longitude === null) return null;
  return {
    label: `${address.label}: ${address.addressLine}`,
    name: address.label,
    city: address.city,
    state: address.state,
    kind: "saved",
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

export function validatePincode(value: string): string | null {
  return /^[1-9]\d{5}$/.test(value.trim()) ? null : "Enter a valid 6-digit PIN code";
}
