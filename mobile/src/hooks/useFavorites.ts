import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { FavoriteProvider } from "@/types";
import { queryKeys } from "./queryKeys";

export function useFavorites(): UseQueryResult<FavoriteProvider[]> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: queryKeys.favorites,
    enabled: signedIn,
    queryFn: async (): Promise<FavoriteProvider[]> =>
      (await api<{ results: FavoriteProvider[] }>("/me/favorites")).results,
  });
}
