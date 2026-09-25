import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { BillingResponse, PlanState } from "@/types/billing";
import { useSession } from "./useSession";

export const BILLING_KEY = ["billing"] as const;

/** Plan, plans on sale, payments and invoices for the Plan and billing screen. */
export function useBilling(): UseQueryResult<BillingResponse> {
  return useQuery({ queryKey: BILLING_KEY, queryFn: () => api<BillingResponse>("/provider/billing") });
}

const FREE: PlanState = {
  plan: { id: null, code: "free", name: "Free" },
  entitlements: [],
  features: { analytics: false, whatsapp: false, promote: false, priority_support: false },
  subscription: null,
  limits: { leads: { limit: null, used: 0 }, photos: { limit: null, used: 0 } },
};

/** The business's plan from the session. Everything that is shown or hidden by plan reads it. */
export function usePlan(): PlanState {
  return useSession().data?.state.plan ?? FREE;
}

/** Refreshes everything that depends on the plan after it changes. */
export function useRefreshPlan(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["session"] }),
      qc.invalidateQueries({ queryKey: BILLING_KEY }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
      qc.invalidateQueries({ queryKey: ["leads"] }),
      qc.invalidateQueries({ queryKey: ["sponsored"] }),
    ]);
  };
}

/** Asks the server to read the store subscription from RevenueCat now, instead of waiting for its webhook. */
export function useSyncStorePurchase() {
  const refresh = useRefreshPlan();
  return useMutation({
    mutationFn: () => api<{ state: PlanState }>("/provider/billing/revenuecat/sync", { method: "POST" }),
    onSettled: () => refresh(),
  });
}
