import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { PopularTerm } from "@/types";
import { queryKeys } from "./queryKeys";

export function usePopularSearches(): UseQueryResult<PopularTerm[]> {
  return useQuery({
    queryKey: queryKeys.popular,
    queryFn: async (): Promise<PopularTerm[]> =>
      (await api<{ terms: PopularTerm[] }>("/search/popular")).terms,
    staleTime: 30 * 60 * 1000,
  });
}
