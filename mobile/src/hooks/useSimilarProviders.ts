import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { ProviderCard } from "@/types";
import { queryKeys } from "./queryKeys";

/** Up to four nearby providers in the same category, for the bottom of a profile. */
export function useSimilarProviders(slug: string): UseQueryResult<ProviderCard[]> {
  return useQuery({
    queryKey: queryKeys.similar(slug),
    enabled: !!slug,
    queryFn: async (): Promise<ProviderCard[]> =>
      (await api<{ results: ProviderCard[] }>(`/providers/${encodeURIComponent(slug)}/similar`)).results,
  });
}
