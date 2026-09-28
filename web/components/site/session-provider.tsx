"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { identifyUser, resetUser } from "@/lib/analytics";
import type { SessionUser } from "@/lib/types";

interface SessionState {
  user: SessionUser | null;
  unread: number;
  /** True until the first answer from /api/session. */
  loading: boolean;
  refresh: () => Promise<void>;
  setUnread: (n: number) => void;
}

interface SessionData {
  user: SessionUser | null;
  unread: number;
}

async function loadSession(): Promise<SessionData | null> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    return (await res.json()) as SessionData;
  } catch {
    return null;
  }
}

const SessionContext = createContext<SessionState>({
  user: null,
  unread: 0,
  loading: true,
  refresh: async () => undefined,
  setUnread: () => undefined,
});

/** Loads the signed-in person in the browser, so every page can be cached for everyone. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((data: SessionData | null) => {
    // null means the request failed: keep what we had; the next navigation tries again.
    if (data) {
      setUser(data.user);
      setUnread(data.unread);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => apply(await loadSession()), [apply]);

  // Signing in, out or reading notifications all end in a navigation, so refreshing on each one keeps the header right.
  useEffect(() => {
    let cancelled = false;
    void loadSession().then((data) => {
      if (!cancelled) apply(data);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, apply]);

  // Analytics follows the session: identify on sign-in (and on role or profile changes), reset on sign-out.
  const identified = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = user ? `${user.id}:${user.role}:${user.name}:${user.email}:${user.provider?.id ?? ""}` : null;
    if (key === identified.current) return;
    // Without a user the keys only differ when someone was identified before, so this is a sign-out.
    if (user) identifyUser(user);
    else resetUser();
    identified.current = key;
  }, [user, loading]);

  return <SessionContext.Provider value={{ user, unread, loading, refresh, setUnread }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
