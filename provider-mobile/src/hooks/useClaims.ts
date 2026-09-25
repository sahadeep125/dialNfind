import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type {
  ClaimListing,
  StartClaimInput,
  StartClaimResponse,
  VerifyClaimInput,
  VerifyClaimResponse,
} from "@/types/onboarding";

export const claimKeys = {
  search: (q: string, city: string) => ["claims", "search", q, city] as const,
  listing: (id: number) => ["claims", "listing", id] as const,
};

/** Unclaimed and claimed listings matching a name or phone number. Runs once q is at least 2 characters. */
export function useClaimSearch(q: string, city: string): UseQueryResult<ClaimListing[]> {
  const term = q.trim();
  return useQuery({
    queryKey: claimKeys.search(term, city),
    enabled: term.length >= 2,
    queryFn: async (): Promise<ClaimListing[]> =>
      (
        await api<{ results: ClaimListing[] }>("/provider/claims/search", {
          query: { q: term, city },
        })
      ).results,
  });
}

/** One listing by id, for claim links opened from the website. */
export function useClaimListing(id: number | null): UseQueryResult<ClaimListing> {
  return useQuery({
    queryKey: claimKeys.listing(id ?? 0),
    enabled: id !== null,
    queryFn: async (): Promise<ClaimListing> =>
      (await api<{ listing: ClaimListing }>(`/provider/claims/listing/${id}`)).listing,
  });
}

/** Starts a claim: phone_otp sends a code to the listing's number, document waits for review. */
export function useStartClaim() {
  return useMutation<StartClaimResponse, Error, StartClaimInput>({
    mutationFn: (input: StartClaimInput): Promise<StartClaimResponse> =>
      api<StartClaimResponse>("/provider/claims", { method: "POST", body: input }),
  });
}

export function useVerifyClaim() {
  return useMutation<VerifyClaimResponse, Error, VerifyClaimInput>({
    mutationFn: ({ claimId, code }: VerifyClaimInput): Promise<VerifyClaimResponse> =>
      api<VerifyClaimResponse>(`/provider/claims/${claimId}/verify`, {
        method: "POST",
        body: { code },
      }),
  });
}
