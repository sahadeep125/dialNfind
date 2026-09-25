import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { PortfolioItem } from "@/types";
import type { PortfolioBody } from "@/types/listing";
import { refreshListing } from "./listingKeys";

interface SaveInput {
  id?: number;
  body: PortfolioBody;
}

/** Adds a photo (POST) or edits one (PATCH /provider/portfolio/:id). */
export function useSavePortfolioItem(): UseMutationResult<PortfolioItem, Error, SaveInput> {
  const qc = useQueryClient();
  return useMutation<PortfolioItem, Error, SaveInput>({
    mutationFn: async ({ id, body }: SaveInput): Promise<PortfolioItem> =>
      (
        await api<{ item: PortfolioItem }>(
          id ? `/provider/portfolio/${id}` : "/provider/portfolio",
          {
            method: id ? "PATCH" : "POST",
            body,
          },
        )
      ).item,
    onSuccess: () => refreshListing(qc),
  });
}

export function useDeletePortfolioItem(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id: number): Promise<void> => {
      await api<{ ok: boolean }>(`/provider/portfolio/${id}`, { method: "DELETE" });
    },
    onSuccess: () => refreshListing(qc),
  });
}
