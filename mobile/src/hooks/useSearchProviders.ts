import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";
import type { SearchFilters, SearchResponse } from "@/types";
import { queryKeys } from "./queryKeys";

const PAGE_SIZE = 12;

/** Directory search with infinite scroll. Mirrors the website's /search page. */
export function useSearchProviders(
  filters: SearchFilters,
  enabled = true,
): UseInfiniteQueryResult<InfiniteData<SearchResponse>> {
  const location = useLocationStore((s) => s.location);
  const signedIn = useAuthStore((s) => !!s.token);
  return useInfiniteQuery({
    queryKey: queryKeys.search(filters, location, signedIn),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<SearchResponse> =>
      api<SearchResponse>("/search/providers", {
        query: {
          q: filters.q,
          category: filters.category,
          subcategory: filters.subcategory,
          sort: filters.sort,
          openNow: filters.openNow || undefined,
          verified: filters.verified || undefined,
          minRating: filters.minRating,
          radiusKm: filters.radiusKm,
          lat: location.latitude,
          lng: location.longitude,
          page: pageParam,
          pageSize: PAGE_SIZE,
        },
      }),
    getNextPageParam: (last: SearchResponse): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}
