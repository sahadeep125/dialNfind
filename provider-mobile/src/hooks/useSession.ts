import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { STORAGE_KEYS, storage } from "@/services/storage";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderState, SessionUser } from "@/types";
import { queryKeys } from "./queryKeys";

const NO_BUSINESS: ProviderState = { provider: null, claims: [] };

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
      // A listing picked earlier that this account no longer owns (or another account's) is forgotten.
      const picked = storage.getString(STORAGE_KEYS.listingId);
      if (picked && state.listings && !state.listings.some((l) => String(l.id) === picked))
        storage.remove(STORAGE_KEYS.listingId);
      return { user, state };
    },
  });
  const user = query.data?.user;
  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);
  return query;
}
