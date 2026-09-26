import { create } from "zustand";

import { configureApi } from "@/services/api";
import { STORAGE_KEYS, readJson, secureToken, storage, writeJson } from "@/services/storage";
import { useUIStore } from "@/stores/useUIStore";
import type { SessionUser } from "@/types";

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  /** False until the token has been read from the secure store at launch. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: readJson<SessionUser>(STORAGE_KEYS.authUser),
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await secureToken.get();
    // Someone may have signed in while the store was being read; that session wins.
    const token = get().token ?? stored;
    // A cached user without a token is not a session.
    if (!token) storage.remove(STORAGE_KEYS.authUser);
    set({ token, user: token ? get().user : null, hydrated: true });
  },
  signIn: (token: string, user: SessionUser) => {
    secureToken.set(token);
    writeJson(STORAGE_KEYS.authUser, user);
    set({ token, user });
  },
  setUser: (user: SessionUser) => {
    if (!get().token) return;
    writeJson(STORAGE_KEYS.authUser, user);
    set({ user });
  },
  signOut: () => {
    secureToken.clear();
    storage.remove(STORAGE_KEYS.authUser);
    set({ token: null, user: null });
  },
}));

configureApi({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    // Several requests can fail at once; only the first one signs out and tells the user.
    if (!useAuthStore.getState().token) return;
    useAuthStore.getState().signOut();
    useUIStore.getState().pushToast("Your session has ended. Please sign in again.", "info");
  },
  onUnverified: () => {
    const { user, setUser } = useAuthStore.getState();
    if (user?.emailVerifiedAt) setUser({ ...user, emailVerifiedAt: null });
  },
});
