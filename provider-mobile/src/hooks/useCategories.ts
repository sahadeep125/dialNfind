import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Category } from "@/types";
import { queryKeys } from "./queryKeys";

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<Category[]> =>
      (await api<{ categories: Category[] }>("/categories")).categories,
    staleTime: 10 * 60 * 1000,
  });
}
