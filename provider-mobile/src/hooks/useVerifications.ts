import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type {
  SubmittableVerificationType,
  Verification,
  VerificationsResponse,
} from "@/types/listing";
import { listingKeys, refreshListing } from "./listingKeys";

export function useVerifications(): UseQueryResult<VerificationsResponse> {
  return useQuery({
    queryKey: listingKeys.verifications,
    queryFn: (): Promise<VerificationsResponse> =>
      api<VerificationsResponse>("/provider/verifications"),
  });
}

interface SubmitInput {
  type: SubmittableVerificationType;
  documentUrl: string;
}

/** Sends a document for the team to review. Approval happens in the admin console. */
export function useSubmitVerification(): UseMutationResult<Verification, Error, SubmitInput> {
  const qc = useQueryClient();
  return useMutation<Verification, Error, SubmitInput>({
    mutationFn: async (body: SubmitInput): Promise<Verification> =>
      (
        await api<{ verification: Verification }>("/provider/verifications", {
          method: "POST",
          body,
        })
      ).verification,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: listingKeys.verifications });
      await refreshListing(qc);
    },
  });
}
