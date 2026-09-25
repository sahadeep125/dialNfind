import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Hours, ProviderProfile } from "@/types";
import type { ProfileResponse } from "@/types/listing";
import { refreshListing } from "./listingKeys";

/** Replaces the weekly hours (PUT /provider/hours { hours }). */
export function useSaveHours(): UseMutationResult<ProviderProfile, Error, Hours[]> {
  const qc = useQueryClient();
  return useMutation<ProviderProfile, Error, Hours[]>({
    mutationFn: async (hours: Hours[]): Promise<ProviderProfile> =>
      (await api<ProfileResponse>("/provider/hours", { method: "PUT", body: { hours } })).provider,
    onSuccess: (provider: ProviderProfile) => refreshListing(qc, provider),
  });
}
