import { Linking, StyleSheet, View } from "react-native";
import { Crown } from "lucide-react-native";

import { AppBadge, AppButton, AppCard, AppText } from "@/components/design-system";
import { SOURCE_LABEL } from "@/constants/plans";
import { openStoreSubscriptions } from "@/hooks/usePurchases";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { BillingResponse } from "@/types/billing";
import { formatDate } from "@/utils/format";

const STATUS = {
  active: { label: "Active", tone: "success" },
  past_due: { label: "Payment failed", tone: "danger" },
  pending: { label: "Waiting for payment", tone: "warning" },
  expired: { label: "Ended", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

/**
 * The plan the business is on, where it is billed, usage this month, and the store's manage screen. A plan
 * bought on the web has no button here: store rules forbid linking to another way to pay.
 */
export function CurrentPlanCard({ billing }: { billing: BillingResponse }) {
  const theme = useTheme();
  const toast = useToast();
  const { state } = billing;
  const sub = state.subscription;
  const { leads, photos } = state.limits;
  const status = sub ? STATUS[sub.status] : null;
  const renewal = sub?.endDate
    ? `${sub.cancelAtPeriodEnd || sub.source === "admin" ? "Ends" : "Renews"} on ${formatDate(sub.endDate)}`
    : null;

  const manageInStore = (): void => {
    openStoreSubscriptions().catch((error: unknown) => {
      if (billing.manageUrl) void Linking.openURL(billing.manageUrl);
      else toast(errorMessage(error), "error");
    });
  };

  const meter = (label: string, used: number, limit: number | null) => (
    <View style={[styles.flex, { gap: 6 }]}>
      <View style={styles.between}>
        <AppText variant="meta" style={{ color: WHITE_70 }}>
          {label}
        </AppText>
        <AppText variant="caption" tone="white" numeric>
          {limit === null ? `${used} · unlimited` : `${Math.min(used, limit)}/${limit}`}
        </AppText>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              width:
                limit === null ? "100%" : `${Math.min(100, (used / Math.max(1, limit)) * 100)}%`,
              opacity: limit === null ? 0.35 : 1,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <AppCard variant="hero">
      <View style={{ gap: theme.spacing[4] }}>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <View style={[styles.icon, { borderRadius: theme.radius.md }]}>
            <Crown size={20} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <View style={[styles.row, { gap: theme.spacing[2] }]}>
              <AppText variant="heading" tone="white" numberOfLines={1}>
                {state.plan.name}
              </AppText>
              {status ? <AppBadge label={status.label} tone={status.tone} /> : null}
            </View>
            <AppText variant="meta" style={{ color: WHITE_70 }}>
              {sub
                ? [SOURCE_LABEL[sub.source], renewal].filter(Boolean).join(" · ")
                : "Free forever. Upgrade any time."}
            </AppText>
          </View>
        </View>

        <View style={[styles.row, { gap: theme.spacing[4], flexWrap: "nowrap" }]}>
          {meter("Leads this month", leads.used, leads.limit)}
          {meter("Photos", photos.used, photos.limit)}
        </View>

        {billing.managedIn === "app_store" || billing.managedIn === "play_store" ? (
          <AppButton variant="neutral" size="sm" onPress={manageInStore} style={styles.manage}>
            {billing.managedIn === "app_store"
              ? "Manage in the App Store"
              : "Manage in Google Play"}
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
}

const WHITE_70 = "rgba(255,255,255,0.72)";

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  between: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  icon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  flex: { flex: 1, gap: 2 },
  track: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 2,
    height: 4,
    overflow: "hidden",
  },
  bar: { backgroundColor: "#FFFFFF", borderRadius: 2, height: 4 },
  manage: { alignSelf: "flex-start" },
});
