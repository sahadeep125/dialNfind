import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderProfile } from "@/types";
import { queryKeys } from "./queryKeys";

/** The full business profile that the profile, services, hours, areas and portfolio screens edit. */
export function useProfile(): UseQueryResult<ProviderProfile> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: queryKeys.profile,
    enabled: signedIn,
    queryFn: async (): Promise<ProviderProfile> =>
      (await api<{ provider: ProviderProfile }>("/provider/profile")).provider,
  });
}
