import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Suggestion } from "@/types";
import { queryKeys } from "./queryKeys";

export function useSuggestions(q: string): UseQueryResult<Suggestion[]> {
  const term = q.trim();
  return useQuery({
    queryKey: queryKeys.suggestions(term),
    enabled: term.length >= 2,
    queryFn: async (): Promise<Suggestion[]> =>
      (await api<{ suggestions: Suggestion[] }>("/search/suggest", { query: { q: term } }))
        .suggestions,
    staleTime: 60 * 1000,
  });
}
