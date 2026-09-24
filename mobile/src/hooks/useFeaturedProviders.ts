import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";
import type { ProviderCard } from "@/types";
import { queryKeys } from "./queryKeys";

/** Top-ranked providers around the selected location, for the home screen. */
export function useFeaturedProviders(): UseQueryResult<ProviderCard[]> {
  const location = useLocationStore((s) => s.location);
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: queryKeys.featured(location, signedIn),
    queryFn: async (): Promise<ProviderCard[]> =>
      (
        await api<{ results: ProviderCard[] }>("/providers/featured", {
          query: { lat: location.latitude, lng: location.longitude, limit: 10 },
        })
      ).results,
  });
}
