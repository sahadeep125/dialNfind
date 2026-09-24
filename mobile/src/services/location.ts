import * as Location from "expo-location";

import type { LocationOption } from "@/types";

/** Asks for permission and returns the device position as a location option, or throws with a readable message. */
export async function getCurrentLocation(): Promise<LocationOption> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted")
    throw new Error("Location permission was not given. Pick your area from the list instead.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  let city = "";
  let area = "";
  let state = "";
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    city = place?.city ?? place?.subregion ?? "";
    area = place?.district ?? place?.street ?? "";
    state = place?.region ?? "";
  } catch (error: unknown) {
    // Reverse geocoding is a nicety; the coordinates alone are enough to search.
    console.error("[location] Reverse geocode failed", error);
  }
  const name = area || city || "Current location";
  return {
    label: city && area ? `${area}, ${city}` : name,
    name,
    city,
    state,
    kind: "current",
    latitude,
    longitude,
  };
}
