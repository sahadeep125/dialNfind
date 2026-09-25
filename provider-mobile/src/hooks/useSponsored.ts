import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Campaign, NewCampaignInput, PaymentResult, SponsoredResponse } from "@/types/billing";

const SPONSORED_KEY = ["sponsored"] as const;

/** Campaigns, the categories this business can promote and the current pricing. */
export function useSponsored(): UseQueryResult<SponsoredResponse> {
  return useQuery({
    queryKey: SPONSORED_KEY,
    queryFn: (): Promise<SponsoredResponse> => api<SponsoredResponse>("/provider/sponsored"),
  });
}

/** Starts a campaign. Payment is simulated by the server until a gateway is connected. */
export function useStartCampaign(): UseMutationResult<PaymentResult, Error, NewCampaignInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCampaignInput): Promise<PaymentResult> =>
      api<PaymentResult>("/provider/sponsored", { method: "POST", body: input }),
    onSuccess: () => {
      // A campaign adds a transaction and changes ranking, so refresh everything like the web app.
      void qc.invalidateQueries();
    },
  });
}

/** Pauses a running campaign or resumes a paused one. */
export function useToggleCampaign(): UseMutationResult<unknown, Error, Campaign> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaign: Campaign): Promise<unknown> =>
      api(`/provider/sponsored/${campaign.id}`, {
        method: "PATCH",
        body: { status: campaign.status === "active" ? "paused" : "active" },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SPONSORED_KEY });
    },
  });
}
