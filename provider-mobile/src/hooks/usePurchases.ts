import { Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Purchases, { PURCHASES_ERROR_CODE, type PurchasesError, type PurchasesPackage } from "react-native-purchases";

import { api } from "@/services/api";
import { purchasesEnabled } from "@/services/purchases";
import type { BillingCycle, Plan, PlanState } from "@/types/billing";
import { useRefreshPlan } from "./useSubscription";

/** The store packages on sale, from RevenueCat's current offering. */
export function useOfferings() {
  return useQuery({
    queryKey: ["offerings"],
    enabled: purchasesEnabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<PurchasesPackage[]> => {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages ?? [];
    },
  });
}

/** The store product for a plan and billing cycle, matched on the product ids the server keeps per price. */
export function packageFor(packages: PurchasesPackage[] | undefined, plan: Plan, cycle: BillingCycle): PurchasesPackage | null {
  const price = plan.prices.find((p) => p.billingCycle === cycle);
  const productId = Platform.OS === "ios" ? price?.iosProductId : price?.androidProductId;
  if (!productId || !packages) return null;
  // Android product ids come back as subscription:base-plan, the same form the server stores.
  return packages.find((p) => p.product.identifier === productId) ?? null;
}

const isCancelled = (error: unknown): boolean =>
  (error as PurchasesError | null)?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || (error as { userCancelled?: boolean } | null)?.userCancelled === true;

const syncPlan = () => api<{ state: PlanState }>("/provider/billing/revenuecat/sync", { method: "POST" });

/**
 * Buys a package in the store, then has the server read the new subscription from RevenueCat.
 * Resolves with null when the provider cancels the store sheet.
 */
export function usePurchase() {
  const refresh = useRefreshPlan();
  return useMutation({
    mutationFn: async ({ pkg, replacing }: { pkg: PurchasesPackage; replacing?: string | null }): Promise<PlanState | null> => {
      try {
        // On Google Play a plan change must name the subscription it replaces; the App Store handles it within the group.
        await Purchases.purchasePackage(pkg, null, Platform.OS === "android" && replacing ? { oldProductIdentifier: replacing } : null);
      } catch (error: unknown) {
        if (isCancelled(error)) return null;
        throw error;
      }
      return (await syncPlan()).state;
    },
    onSettled: () => refresh(),
  });
}

/** Restore purchases (required by the App Store): re-links store subscriptions to this business. */
export function useRestore() {
  const refresh = useRefreshPlan();
  return useMutation({
    mutationFn: async (): Promise<PlanState> => {
      await Purchases.restorePurchases();
      return (await syncPlan()).state;
    },
    onSettled: () => refresh(),
  });
}

/** Opens the store's own subscription management (change or cancel). */
export async function openStoreSubscriptions(): Promise<void> {
  await Purchases.showManageSubscriptions();
}
