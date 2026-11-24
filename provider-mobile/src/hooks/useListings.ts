import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";

import { api } from "@/services/api";
import { STORAGE_KEYS, storage } from "@/services/storage";
import type { Profession } from "@/types";
import { queryKeys } from "./queryKeys";

/** What an individual professional can list as. Changes only when KaajVa edits its categories. */
export function useProfessions(): UseQueryResult<Profession[]> {
  return useQuery({
    queryKey: queryKeys.professions,
    queryFn: async (): Promise<Profession[]> =>
      (await api<{ professions: Profession[] }>("/categories/professions")).professions,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Works on another of the account's listings (an individual has one per profession). Every request
 * after this carries its id, and everything on screen that belonged to the previous one is dropped.
 */
export function useSwitchListing(): (id: number) => Promise<void> {
  const qc = useQueryClient();
  return useCallback(
    async (id: number) => {
      storage.set(STORAGE_KEYS.listingId, String(id));
      qc.removeQueries({ predicate: (q) => !SHARED.has(String(q.queryKey[0])) });
      await qc.invalidateQueries({ queryKey: ["session"] });
    },
    [qc],
  );
}

/** Queries that are about the account or KaajVa, not one listing, and survive a switch. */
const SHARED = new Set(["session", "categories", "professions", "locations", "app-config"]);
