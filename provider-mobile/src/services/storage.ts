import * as SecureStore from "expo-secure-store";

/** The part of MMKV the app uses, so a fallback can stand in for it. */
interface KeyValueStore {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
}

/**
 * MMKV is a native module. In Expo Go or a build made before it was installed it is missing, and
 * importing it throws at startup. Loading it lazily lets the app still open, keeping data in memory.
 */
function createStore(): KeyValueStore {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy so a missing native module can be caught
    const { createMMKV } = require("react-native-mmkv") as typeof import("react-native-mmkv");
    return createMMKV({ id: "dialnfind-business" });
  } catch (error: unknown) {
    console.error(
      "[storage] MMKV is not available in this build; nothing will be saved between launches. Use a development build (npx expo run:android).",
      error,
    );
    const memory = new Map<string, string>();
    return {
      getString: (key: string) => memory.get(key),
      set: (key: string, value: string) => void memory.set(key, value),
      remove: (key: string) => void memory.delete(key),
    };
  }
}

/** App-wide key/value store for preferences and cached session data. MMKV is synchronous, so stores can read it at startup. */
export const storage: KeyValueStore = createStore();

export const STORAGE_KEYS = {
  /** Only read to move tokens saved by older versions into the secure store. */
  legacyAuthToken: "auth.token",
  authUser: "auth.user",
  themePreference: "prefs.theme",
  onboardingDraft: "onboarding.draft",
  pushToken: "push.token",
} as const;

const SECURE_TOKEN_KEY = "dialnfind.authToken";

/**
 * The session token lives in the Keychain (iOS) / Keystore (Android), not in MMKV. If the secure
 * store is unavailable, the token is kept for this launch only.
 */
export const secureToken = {
  async get(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (token) return token;
      // One-time move from the plain store used before.
      const legacy = storage.getString(STORAGE_KEYS.legacyAuthToken);
      if (legacy) {
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacy);
        storage.remove(STORAGE_KEYS.legacyAuthToken);
      }
      return legacy ?? null;
    } catch (error: unknown) {
      console.error("[storage] Secure store unavailable", error);
      return null;
    }
  },
  set(token: string): void {
    storage.remove(STORAGE_KEYS.legacyAuthToken);
    SecureStore.setItemAsync(SECURE_TOKEN_KEY, token).catch((error: unknown) =>
      console.error("[storage] Could not save the session securely", error),
    );
  },
  clear(): void {
    storage.remove(STORAGE_KEYS.legacyAuthToken);
    SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch((error: unknown) =>
      console.error("[storage] Could not clear the session", error),
    );
  },
};

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
