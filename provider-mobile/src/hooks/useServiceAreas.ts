import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { track } from "@/services/analytics";
import { api } from "@/services/api";
import type { ProviderProfile, ServiceArea } from "@/types";
import type { ProfileResponse } from "@/types/listing";
import { refreshListing } from "./listingKeys";

interface SaveAreasInput {
  areas: ServiceArea[];
  /** Sent to PATCH /provider/profile only when it changed. */
  serviceRadiusKm?: number;
}

/** Replaces the service areas (PUT /provider/service-areas) and, if given, the travel radius. */
export function useSaveServiceAreas(): UseMutationResult<ProviderProfile, Error, SaveAreasInput> {
  const qc = useQueryClient();
  return useMutation<ProviderProfile, Error, SaveAreasInput>({
    mutationFn: async ({ areas, serviceRadiusKm }: SaveAreasInput): Promise<ProviderProfile> => {
      const serviceAreas = areas.map(({ areaName, pincode, latitude, longitude }) => ({
        areaName,
        pincode: pincode ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }));
      const saved = await api<ProfileResponse>("/provider/service-areas", {
        method: "PUT",
        body: { serviceAreas },
      });
      if (serviceRadiusKm === undefined) return saved.provider;
      return (
        await api<ProfileResponse>("/provider/profile", {
          method: "PATCH",
          body: { serviceRadiusKm },
        })
      ).provider;
    },
    onSuccess: (provider: ProviderProfile, { areas, serviceRadiusKm }: SaveAreasInput) => {
      track("listing_section_saved", { section: "serviceAreas", item_count: areas.length, service_radius_km: serviceRadiusKm });
      return refreshListing(qc, provider);
    },
  });
}
