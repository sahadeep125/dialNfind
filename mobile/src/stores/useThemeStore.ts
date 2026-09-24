import { create } from "zustand";

import { STORAGE_KEYS, storage } from "@/services/storage";
import type { ThemePreference } from "@/types";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const stored = storage.getString(STORAGE_KEYS.themePreference);
const initial: ThemePreference = stored === "light" || stored === "dark" ? stored : "system";

export const useThemeStore = create<ThemeState>((set) => ({
  preference: initial,
  setPreference: (preference: ThemePreference) => {
    storage.set(STORAGE_KEYS.themePreference, preference);
    set({ preference });
  },
}));
