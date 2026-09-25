import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { ProviderProfile } from "@/types";
import type { ProfileResponse, ProfileUpdateBody } from "@/types/listing";
import { refreshListing } from "./listingKeys";

/** PATCH /provider/profile with any subset of the editable fields. */
export function useSaveProfile(): UseMutationResult<ProviderProfile, Error, ProfileUpdateBody> {
  const qc = useQueryClient();
  return useMutation<ProviderProfile, Error, ProfileUpdateBody>({
    mutationFn: async (body: ProfileUpdateBody): Promise<ProviderProfile> =>
      (await api<ProfileResponse>("/provider/profile", { method: "PATCH", body })).provider,
    onSuccess: (provider: ProviderProfile) => refreshListing(qc, provider),
  });
}
