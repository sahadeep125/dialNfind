import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { ProviderProfile, ProviderService } from "@/types";
import type { ProfileResponse, ServiceInput } from "@/types/listing";
import { listingKeys, refreshListing } from "./listingKeys";

/** Only the fields PUT /provider/services accepts. */
export function toServiceInput(s: ProviderService): ServiceInput {
  return {
    categoryId: s.categoryId,
    subcategoryId: s.subcategoryId,
    startingPrice: s.startingPrice,
    priceUnit: s.priceUnit,
    isPrimary: s.isPrimary,
  };
}

/** Replaces the whole service list. The server keeps ids of unchanged rows, so answers survive. */
export function useSaveServices(): UseMutationResult<ProviderProfile, Error, ServiceInput[]> {
  const qc = useQueryClient();
  return useMutation<ProviderProfile, Error, ServiceInput[]>({
    mutationFn: async (services: ServiceInput[]): Promise<ProviderProfile> =>
      (await api<ProfileResponse>("/provider/services", { method: "PUT", body: { services } }))
        .provider,
    onSuccess: async (provider: ProviderProfile) => {
      await refreshListing(qc, provider);
      await qc.invalidateQueries({ queryKey: listingKeys.attributes });
    },
  });
}
