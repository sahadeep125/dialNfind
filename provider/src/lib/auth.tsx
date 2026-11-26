import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { identifyUser, resetUser } from "./analytics";
import { api, ApiError, listingStore, tokenStore } from "./api";
import type { User } from "./types";

/** One of the account's listings, as GET /provider/me lists them. */
export interface OwnListing {
  id: number;
  slug: string;
  businessName: string;
  businessType: "individual" | "company";
  /** "Plumber": the title after an individual's name. Null for a business. */
  professionLabel: string | null;
  primaryCategory: { id: number; name: string } | null;
  locality: string | null;
  city: string;
  status: string;
  profileCompletenessPct: number;
  verificationStatus: string;
}

export interface ProviderState {
  /** The listing being worked on (the one picked with switchListing, else the first). */
  provider: OwnListing | null;
  /** Every listing the account owns: an individual professional has one per profession. */
  listings?: OwnListing[];
  accountType?: "individual" | "business" | null;
  canAddListing?: boolean;
  claims: { id: number; status: string; method: string; provider: { id: number; businessName: string; city: string } }[];
}

interface AuthContextValue {
  user: User | null;
  providerState: ProviderState | null;
  loading: boolean;
  /** The session could not be checked (API down, network error). Not the same as being signed out. */
  unreachable: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  /** Works on another of the account's listings: every page reloads its data for it. */
  switchListing: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(tokenStore.get());

  const me = useQuery({
    queryKey: ["auth", "me", token],
    enabled: !!token,
    queryFn: async () => {
      const { user } = await api<{ user: User }>("/auth/me");
      // Business data is closed until the email address is confirmed.
      const state = user.emailVerifiedAt ? await api<ProviderState>("/provider/me") : null;
      // A listing picked earlier that this account no longer owns (or another account's) is forgotten.
      const picked = listingStore.get();
      if (picked && state && !(state.listings ?? []).some((l) => String(l.id) === picked)) listingStore.clear();
      return { user, state };
    },
    retry: false,
  });

  useEffect(() => {
    const onLogout = () => setToken(null);
    window.addEventListener("kjv:logout", onLogout);
    return () => window.removeEventListener("kjv:logout", onLogout);
  }, []);

  // Analytics follows the session: identify once the account loads (again when the role changes),
  // reset when the token goes (sign-out, or a 401 anywhere).
  const identified = useRef<string | null>(null);
  const meUser = me.data?.user;
  useEffect(() => {
    if (token && meUser) {
      const key = `${meUser.id}:${meUser.role}:${meUser.name}:${meUser.email}:${meUser.provider?.id ?? ""}`;
      if (key !== identified.current) identifyUser(meUser);
      identified.current = key;
    } else if (!token && identified.current !== null) {
      resetUser();
      identified.current = null;
    }
  }, [token, meUser]);

  const signIn = useCallback(
    async (next: string) => {
      tokenStore.set(next);
      setToken(next);
      await qc.invalidateQueries({ queryKey: ["auth"] });
    },
    [qc],
  );

  const signOut = useCallback(() => {
    // Ends the session on the server too; the request carries the token before it is cleared below.
    void api("/auth/logout", { method: "POST" }).catch(() => undefined);
    tokenStore.clear();
    listingStore.clear();
    setToken(null);
    qc.clear();
  }, [qc]);

  const switchListing = useCallback(
    async (id: number) => {
      listingStore.set(id);
      // Everything on screen belongs to the previous listing.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
      await qc.invalidateQueries({ queryKey: ["auth"] });
    },
    [qc],
  );

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["auth"] });
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? (me.data?.user ?? null) : null,
      providerState: token ? (me.data?.state ?? null) : null,
      loading: !!token && me.isLoading,
      unreachable: !!token && me.isError && !(me.error instanceof ApiError && me.error.status === 401),
      signIn,
      signOut,
      refresh,
      switchListing,
    }),
    [token, me.data, me.isLoading, me.isError, me.error, signIn, signOut, refresh, switchListing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
