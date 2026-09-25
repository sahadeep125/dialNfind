import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderState, SessionUser } from "@/types";
import { queryKeys } from "./queryKeys";

interface Session {
  user: SessionUser;
  state: ProviderState;
}

/**
 * The signed-in person and their business. Every screen that needs to know whether a business
 * exists reads this; it refreshes after onboarding, claims and profile saves.
 */
export function useSession(): UseQueryResult<Session> {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: queryKeys.session(token),
    enabled: !!token,
    retry: false,
    queryFn: async (): Promise<Session> => {
      const [{ user }, state] = await Promise.all([
        api<{ user: SessionUser }>("/auth/me"),
        api<ProviderState>("/provider/me"),
      ]);
      return { user, state };
    },
  });
  const user = query.data?.user;
  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);
  return query;
}
