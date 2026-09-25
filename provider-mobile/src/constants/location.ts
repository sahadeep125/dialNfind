import type { LocationOption } from "@/types";

/** Used until the person picks a place or shares their location. Matches the website's default. */
export const DEFAULT_LOCATION: LocationOption = {
  label: "Sevoke Road, Siliguri",
  name: "Sevoke Road",
  city: "Siliguri",
  state: "West Bengal",
  kind: "area",
  latitude: 26.7338,
  longitude: 88.4325,
};
