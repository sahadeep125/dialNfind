import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { LocationOption } from "@/types";
import { queryKeys } from "./queryKeys";

export function useLocations(q: string): UseQueryResult<LocationOption[]> {
  const term = q.trim();
  return useQuery({
    queryKey: queryKeys.locations(term),
    queryFn: async (): Promise<LocationOption[]> =>
      (await api<{ locations: LocationOption[] }>("/locations", { query: { q: term } })).locations,
    staleTime: 5 * 60 * 1000,
  });
}
