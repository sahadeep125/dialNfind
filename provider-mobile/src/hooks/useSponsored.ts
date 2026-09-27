import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { track } from "@/services/analytics";
import { api } from "@/services/api";
import type { Campaign, NewCampaignInput, SponsoredResponse } from "@/types/billing";

/** Campaigns are requested, not bought in the app: the request becomes a support ticket. */
interface BillingRequestResult {
  ticket: { id: number; reference: string };
}

const SPONSORED_KEY = ["sponsored"] as const;

/** Campaigns, the categories this business can promote and the current pricing. */
export function useSponsored(): UseQueryResult<SponsoredResponse> {
  return useQuery({
    queryKey: SPONSORED_KEY,
    queryFn: (): Promise<SponsoredResponse> => api<SponsoredResponse>("/provider/sponsored"),
  });
}

/** Asks the team for a campaign. They arrange payment and start it from the admin console. */
export function useRequestCampaign(): UseMutationResult<BillingRequestResult, Error, NewCampaignInput> {
  return useMutation({
    mutationFn: (input: NewCampaignInput): Promise<BillingRequestResult> =>
      api<BillingRequestResult>("/provider/sponsored/request", { method: "POST", body: input }),
    onSuccess: (_data, input) =>
      track("promotion_requested", { category_id: input.categoryId, days: input.days, budget: input.budget }),
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
    onSuccess: (_data, campaign) => {
      track("promotion_toggled", { campaign_id: campaign.id, status: campaign.status === "active" ? "paused" : "active" });
      void qc.invalidateQueries({ queryKey: SPONSORED_KEY });
    },
  });
}
