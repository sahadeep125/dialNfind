import { useEffect } from "react";
import { router } from "expo-router";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { useSession } from "@/hooks/useSession";
import { useSyncStorePurchase } from "@/hooks/useSubscription";
import { setUpgradeHandler } from "@/services/api";
import { configurePurchases, identifyProvider, isIdentified, purchasesEnabled } from "@/services/purchases";

configurePurchases();

/**
 * Renders nothing. Ties RevenueCat to the signed-in business, tells the server when the store
 * reports a subscription change (renewal, cancellation, refund) while the app is open, and opens
 * the paywall whenever the server says a feature needs a higher plan.
 */
export function PurchasesSync() {
  const session = useSession();
  const providerId = session.data?.state.provider?.id ?? null;
  // TanStack Query keeps mutate stable, so the listener below is added once.
  const { mutate: syncStorePurchase } = useSyncStorePurchase();

  useEffect(() => {
    setUpgradeHandler((feature) => router.push({ pathname: "/paywall", params: feature ? { feature } : {} }));
  }, []);

  useEffect(() => {
    if (!purchasesEnabled || providerId === null) return;
    void identifyProvider(providerId);
  }, [providerId]);

  useEffect(() => {
    if (!purchasesEnabled) return;
    let last = "";
    const listener = (info: CustomerInfo) => {
      if (!isIdentified()) return;
      // Only when something changed, not on every app foreground.
      const key = JSON.stringify(Object.keys(info.entitlements.active).sort()) + (info.latestExpirationDate ?? "");
      if (last && key !== last) syncStorePurchase();
      last = key;
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [syncStorePurchase]);

  return null;
}
