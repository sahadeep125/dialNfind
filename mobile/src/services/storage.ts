import { createMMKV, type MMKV } from "react-native-mmkv";

/** App-wide key/value store for preferences and cached session data. MMKV is synchronous, so stores can read it at startup. */
export const storage: MMKV = createMMKV({ id: "dialnfind" });

export const STORAGE_KEYS = {
  authToken: "auth.token",
  authUser: "auth.user",
  themePreference: "prefs.theme",
  location: "prefs.location",
  recentSearches: "search.recent",
} as const;

export function readJson<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    console.error("[storage] Could not parse stored value", key, error);
    storage.remove(key);
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
