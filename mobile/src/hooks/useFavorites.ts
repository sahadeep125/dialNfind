import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { FavoriteProvider, Paged } from "@/types";
import { queryKeys } from "./queryKeys";

const PAGE_SIZE = 20;

export type FavoritesPage = Paged & { results: FavoriteProvider[] };

/** Saved providers, newest first, loaded page by page. */
export function useFavorites(): UseInfiniteQueryResult<InfiniteData<FavoritesPage>> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useInfiniteQuery({
    queryKey: queryKeys.favorites,
    enabled: signedIn,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<FavoritesPage> =>
      api<FavoritesPage>("/me/favorites", { query: { page: pageParam, pageSize: PAGE_SIZE } }),
    getNextPageParam: (last: FavoritesPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}
