import { create } from "zustand";

import { configureApi } from "@/services/api";
import { STORAGE_KEYS, readJson, storage, writeJson } from "@/services/storage";
import type { SessionUser } from "@/types";

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  signIn: (token: string, user: SessionUser) => void;
  setToken: (token: string) => void;
  setUser: (user: SessionUser) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Read synchronously so the first render already knows whether someone is signed in.
  token: storage.getString(STORAGE_KEYS.authToken) ?? null,
  user: readJson<SessionUser>(STORAGE_KEYS.authUser),
  signIn: (token: string, user: SessionUser) => {
    storage.set(STORAGE_KEYS.authToken, token);
    writeJson(STORAGE_KEYS.authUser, user);
    set({ token, user });
  },
  setToken: (token: string) => {
    storage.set(STORAGE_KEYS.authToken, token);
    set({ token });
  },
  setUser: (user: SessionUser) => {
    if (!get().token) return;
    writeJson(STORAGE_KEYS.authUser, user);
    set({ user });
  },
  signOut: () => {
    storage.remove(STORAGE_KEYS.authToken);
    storage.remove(STORAGE_KEYS.authUser);
    set({ token: null, user: null });
  },
}));

configureApi({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().signOut(),
});
