import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { PaymentResult, SubscriptionResponse } from "@/types/billing";

const SUBSCRIPTION_KEY = ["subscription"] as const;

/** The current plan, every plan on offer and recent payments. */
export function useSubscription(): UseQueryResult<SubscriptionResponse> {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: (): Promise<SubscriptionResponse> =>
      api<SubscriptionResponse>("/provider/subscription"),
  });
}

/** Switches plan. Payment is simulated by the server until a gateway is connected. */
export function useCheckoutPlan(): UseMutationResult<PaymentResult, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: number): Promise<PaymentResult> =>
      api<PaymentResult>("/provider/subscription/checkout", { method: "POST", body: { planId } }),
    onSuccess: () => {
      // A plan change adds badges and changes limits across the app, so refresh everything.
      void qc.invalidateQueries();
    },
  });
}

/** Turns off auto-renew. The plan stays active until its end date. */
export function useCancelAutoRenew(): UseMutationResult<unknown, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<unknown> => api("/provider/subscription/cancel", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    },
  });
}
