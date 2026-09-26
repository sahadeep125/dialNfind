import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderProfile } from "@/types";
import type { Dashboard } from "@/types/dashboard";
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

/**
 * "Available for work": when off, the listing ranks lower until it is switched back on. Updates the
 * dashboard straight away; a failed request refetches the real value.
 */
export function useSetAvailability(): UseMutationResult<unknown, Error, boolean, unknown> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isAvailable: boolean) => api("/provider/profile", { method: "PATCH", body: { isAvailable } }),
    onMutate: (isAvailable: boolean) => {
      qc.setQueriesData<Dashboard>({ queryKey: ["dashboard"] }, (d) => (d ? { ...d, provider: { ...d.provider, isAvailable } } : d));
    },
    onError: () => void qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
