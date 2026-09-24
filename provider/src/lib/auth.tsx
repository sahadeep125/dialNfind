import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "./api";
import type { User } from "./types";

interface ProviderState {
  provider: { id: number; slug: string; businessName: string; status: string; profileCompletenessPct: number; verificationStatus: string } | null;
  claims: { id: number; status: string; method: string; provider: { id: number; businessName: string; city: string } }[];
}

interface AuthContextValue {
  user: User | null;
  providerState: ProviderState | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(tokenStore.get());

  const me = useQuery({
    queryKey: ["auth", "me", token],
    enabled: !!token,
    queryFn: async () => {
      const [{ user }, state] = await Promise.all([api<{ user: User }>("/auth/me"), api<ProviderState>("/provider/me")]);
      return { user, state };
    },
    retry: false,
  });

  useEffect(() => {
    const onLogout = () => setToken(null);
    window.addEventListener("dnf:logout", onLogout);
    return () => window.removeEventListener("dnf:logout", onLogout);
  }, []);

  const signIn = useCallback(
    async (next: string) => {
      tokenStore.set(next);
      setToken(next);
      await qc.invalidateQueries({ queryKey: ["auth"] });
    },
    [qc],
  );

  const signOut = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    qc.clear();
  }, [qc]);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["auth"] });
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? (me.data?.user ?? null) : null,
      providerState: token ? (me.data?.state ?? null) : null,
      loading: !!token && me.isLoading,
      signIn,
      signOut,
      refresh,
    }),
    [token, me.data, me.isLoading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
