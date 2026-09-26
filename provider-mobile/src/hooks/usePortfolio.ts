import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { PortfolioItem, ProviderProfile } from "@/types";
import type { PortfolioBody } from "@/types/listing";
import { refreshListing } from "./listingKeys";
import { queryKeys } from "./queryKeys";

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

/** Saves the order photos show in (the cover always stays first). Reorders on screen straight away. */
export function useReorderPortfolio(): UseMutationResult<void, Error, number[], { before?: ProviderProfile }> {
  const qc = useQueryClient();
  return useMutation<void, Error, number[], { before?: ProviderProfile }>({
    mutationFn: async (ids: number[]): Promise<void> => {
      await api<{ ok: boolean }>("/provider/portfolio/order", { method: "PUT", body: { ids } });
    },
    onMutate: (ids: number[]) => {
      const before = qc.getQueryData<ProviderProfile>(queryKeys.profile);
      if (before) {
        const byId = new Map(before.portfolio.map((i) => [i.id, i]));
        qc.setQueryData<ProviderProfile>(queryKeys.profile, { ...before, portfolio: ids.map((id) => byId.get(id)!).filter(Boolean) });
      }
      return { before };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.before) qc.setQueryData(queryKeys.profile, ctx.before);
    },
    onSettled: () => refreshListing(qc),
  });
}

/** Makes a photo the cover: it shows first on the public listing. */
export function useSetCoverPhoto(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id: number): Promise<void> => {
      await api(`/provider/portfolio/${id}`, { method: "PATCH", body: { isCover: true } });
    },
    onSuccess: () => refreshListing(qc),
  });
}
