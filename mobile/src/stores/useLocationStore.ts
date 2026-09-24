import { create } from "zustand";

import { DEFAULT_LOCATION } from "@/constants/location";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";
import type { LocationOption } from "@/types";

interface LocationState {
  location: LocationOption;
  setLocation: (location: LocationOption) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: readJson<LocationOption>(STORAGE_KEYS.location) ?? DEFAULT_LOCATION,
  setLocation: (location: LocationOption) => {
    writeJson(STORAGE_KEYS.location, location);
    set({ location });
  },
}));
