import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { AppCallout, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { packageFor, useOfferings, usePurchase } from "@/hooks/usePurchases";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { purchasesEnabled } from "@/services/purchases";
import type { BillingCycle, BillingResponse, Plan } from "@/types/billing";
import { formatPrice } from "@/utils/format";
import { PlanCard } from "./PlanCard";

const POPULAR = "business";
const CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly · 2 months free" },
];

interface Props {
  billing: BillingResponse;
  /** Leave out Free (the paywall only sells upgrades). */
  paidOnly?: boolean;
  onPurchased?: (plan: Plan) => void;
}

/**
 * Monthly / yearly toggle and a card per plan with its store price. Buying goes through the App
 * Store or Google Play; a plan bought on the web is managed there instead.
 */
export function PlanPicker({ billing, paidOnly, onPurchased }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const offerings = useOfferings();
  const purchase = usePurchase();
  const { state } = billing;
  const sub = state.subscription;
  const [cycle, setCycle] = useState<BillingCycle>(sub?.billingCycle ?? "monthly");
  const managedElsewhere = billing.managedIn === "web" || billing.managedIn === "support";
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";

  // The store product being replaced when switching plans on Google Play.
  const current = billing.plans.find((p) => p.code === state.plan.code);
  const replacing = sub?.source === "play_store" && current ? current.prices.find((p) => p.billingCycle === sub.billingCycle)?.androidProductId : null;

  const buy = (plan: Plan): void => {
    const pkg = packageFor(offerings.data, plan, cycle);
    if (!pkg) return;
    purchase.mutate(
      { pkg, replacing },
      {
        onSuccess: (result) => {
          if (!result) return;
          toast(`Welcome to ${plan.name}. It is active on the app and the website.`, "success");
          onPurchased?.(plan);
        },
        onError: (error: Error) => toast(errorMessage(error), "error"),
      },
    );
  };

  const plans = billing.plans.filter((p) => !paidOnly || p.code !== "free");

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <AppSegmented options={CYCLES} value={cycle} onChange={setCycle} accessibilityLabel="Billing cycle" />

      {managedElsewhere ? (
        <AppCallout tone="info" title={billing.managedIn === "web" ? "Your plan is billed on the website" : "Your plan was set up by our team"}>
          {billing.managedIn === "web"
            ? "To change it, sign in to DialNFind for Business on the web. Buying here as well would charge you twice."
            : "Contact support to change it."}
        </AppCallout>
      ) : !purchasesEnabled || !billing.store.enabled ? (
        <AppCallout tone="info" title="Upgrade on the website">
          {`Buying in the app is not available yet. You can upgrade on the DialNFind for Business website; your plan works here too.`}
        </AppCallout>
      ) : offerings.isError ? (
        <AppCallout tone="warning" title={`Could not reach the ${storeName}`}>
          Check your connection and pull to refresh.
        </AppCallout>
      ) : null}

      <View style={[styles.grid, { gap: theme.spacing[4] }]}>
        {plans.map((plan) => {
          const pkg = packageFor(offerings.data, plan, cycle);
          const price = plan.prices.find((p) => p.billingCycle === cycle);
          const isCurrent = state.plan.code === plan.code && (plan.code === "free" || sub?.billingCycle === cycle);
          const priceLabel = plan.code === "free" ? "Free" : (pkg?.product.priceString ?? formatPrice(price?.amount ?? null) ?? "");
          const canBuy = plan.code !== "free" && !isCurrent && !managedElsewhere && !!pkg;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceLabel={priceLabel}
              period={plan.code === "free" ? null : cycle}
              isCurrent={isCurrent}
              featured={plan.code === POPULAR}
              actionLabel={
                isCurrent
                  ? "Current plan"
                  : plan.code === "free"
                    ? null
                    : state.plan.code !== "free" && sub?.source !== "admin"
                      ? `Switch to ${plan.name}`
                      : `Get ${plan.name}`
              }
              busy={purchase.isPending && purchase.variables?.pkg.product.identifier === pkg?.product.identifier}
              disabled={!canBuy || purchase.isPending || offerings.isLoading}
              onChoose={() => buy(plan)}
            />
          );
        })}
      </View>

      <AppText variant="caption" tone="tertiary">
        {`Subscriptions renew automatically at the price shown, charged to your ${storeName} account, until you cancel at least 24 hours before the end of the period. Manage or cancel any time in your ${storeName} account settings.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
