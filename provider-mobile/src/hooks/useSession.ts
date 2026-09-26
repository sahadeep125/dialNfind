import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderState, SessionUser } from "@/types";
import { queryKeys } from "./queryKeys";

const NO_BUSINESS: ProviderState = { provider: null, plan: null, claims: [] };

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
      const { user } = await api<{ user: SessionUser }>("/auth/me");
      // Business data is closed until the email address is confirmed.
      const state = user.emailVerifiedAt ? await api<ProviderState>("/provider/me") : NO_BUSINESS;
      return { user, state };
    },
  });
  const user = query.data?.user;
  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);
  return query;
}
