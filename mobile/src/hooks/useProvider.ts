import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderDetail } from "@/types";
import { queryKeys } from "./queryKeys";

export function useProvider(slug: string): UseQueryResult<ProviderDetail> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: [...queryKeys.provider(slug), signedIn],
    enabled: !!slug,
    queryFn: async (): Promise<ProviderDetail> =>
      (await api<{ provider: ProviderDetail }>(`/providers/${encodeURIComponent(slug)}`)).provider,
  });
}
