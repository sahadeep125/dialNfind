import { create } from "zustand";

import { DEFAULT_LOCATION } from "@/constants/location";
import { setCity, track } from "@/services/analytics";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";
import type { LocationOption } from "@/types";

interface LocationState {
  location: LocationOption;
  setLocation: (location: LocationOption) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  location: readJson<LocationOption>(STORAGE_KEYS.location) ?? DEFAULT_LOCATION,
  setLocation: (location: LocationOption) => {
    const previous = get().location;
    writeJson(STORAGE_KEYS.location, location);
    set({ location });
    setCity(location);
    if (previous.label !== location.label) {
      track("location_changed", { city: location.city, location_kind: location.kind, previous_city: previous.city });
    }
  },
}));

// Every event carries the city being browsed, from the first one.
setCity(useLocationStore.getState().location);
