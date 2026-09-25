import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, tokenStore } from "./api";

export type Module =
  | "providers"
  | "verifications"
  | "categories"
  | "plans"
  | "promotions"
  | "reviews"
  | "users"
  | "leads"
  | "support"
  | "notifications"
  | "analytics"
  | "settings"
  | "team"
  | "audit";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  profilePhotoUrl: string | null;
  adminRole: { id: number; name: string } | null;
}

interface AuthContextValue {
  user: AdminUser | null;
  permissions: Set<Module>;
  can: (m: Module) => boolean;
  loading: boolean;
  /** Set when the account signed in but has no admin access. */
  denied: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(tokenStore.get());

  const me = useQuery({
    queryKey: ["admin", "me", token],
    enabled: !!token,
    queryFn: () => api<{ user: AdminUser; permissions: Module[] }>("/admin/me"),
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
      await qc.invalidateQueries({ queryKey: ["admin", "me"] });
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

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set<Module>(token ? (me.data?.permissions ?? []) : []);
    return {
      user: token ? (me.data?.user ?? null) : null,
      permissions,
      can: (m) => permissions.has(m),
      loading: !!token && me.isLoading,
      denied: !!token && me.error instanceof ApiError && me.error.status === 403,
      signIn,
      signOut,
    };
  }, [token, me.data, me.isLoading, me.error, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
