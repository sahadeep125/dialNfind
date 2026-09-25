import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { BillingRequestResult, SubscriptionResponse } from "@/types/billing";

const SUBSCRIPTION_KEY = ["subscription"] as const;

/** The current plan, every plan on offer and recent payments. */
export function useSubscription(): UseQueryResult<SubscriptionResponse> {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: (): Promise<SubscriptionResponse> =>
      api<SubscriptionResponse>("/provider/subscription"),
  });
}

/** Asks the team for a plan. They arrange payment and switch the plan from the admin console. */
export function useRequestPlan(): UseMutationResult<BillingRequestResult, Error, number> {
  return useMutation({
    mutationFn: (planId: number): Promise<BillingRequestResult> =>
      api<BillingRequestResult>("/provider/subscription/request", { method: "POST", body: { planId } }),
  });
}
