import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { identifyUser, resetUser } from "./analytics";
import { api, ApiError, tokenStore } from "./api";
import type { PlanState, User } from "./types";

interface ProviderState {
  provider: { id: number; slug: string; businessName: string; status: string; profileCompletenessPct: number; verificationStatus: string } | null;
  /** The provider's plan, entitlements and limits; null until a business exists. */
  plan: PlanState | null;
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
      return { user, state };
    },
    retry: false,
  });

  useEffect(() => {
    const onLogout = () => setToken(null);
    window.addEventListener("dnf:logout", onLogout);
    return () => window.removeEventListener("dnf:logout", onLogout);
  }, []);

  // Analytics follows the session: identify once the account loads (again when the role or plan changes),
  // reset when the token goes (sign-out, or a 401 anywhere).
  const identified = useRef<string | null>(null);
  const meUser = me.data?.user;
  const planCode = me.data?.state?.plan?.plan.code ?? null;
  useEffect(() => {
    if (token && meUser) {
      const key = `${meUser.id}:${meUser.role}:${meUser.name}:${meUser.email}:${meUser.provider?.id ?? ""}:${planCode ?? ""}`;
      if (key !== identified.current) identifyUser(meUser, planCode);
      identified.current = key;
    } else if (!token && identified.current !== null) {
      resetUser();
      identified.current = null;
    }
  }, [token, meUser, planCode]);

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
      unreachable: !!token && me.isError && !(me.error instanceof ApiError && me.error.status === 401),
      signIn,
      signOut,
      refresh,
    }),
    [token, me.data, me.isLoading, me.isError, me.error, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
