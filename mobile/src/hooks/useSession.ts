import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { queryKeys } from "./queryKeys";

/** Refreshes the stored profile when the app opens, and signs out if the session has expired. */
export function useSession(): void {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const { data } = useQuery({
    queryKey: [...queryKeys.me, token],
    enabled: !!token,
    queryFn: async (): Promise<SessionUser> => (await api<{ user: SessionUser }>("/auth/me")).user,
    retry: false,
  });
  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);
}
