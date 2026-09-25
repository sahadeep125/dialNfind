import { Linking, StyleSheet, View } from "react-native";
import { Crown } from "lucide-react-native";

import { AppBadge, AppButton, AppCard, AppText } from "@/components/design-system";
import { PROVIDER_WEB_URL } from "@/constants/config";
import { SOURCE_LABEL } from "@/constants/plans";
import { openStoreSubscriptions } from "@/hooks/usePurchases";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";
import type { BillingResponse } from "@/types/billing";
import { formatDate } from "@/utils/format";

const STATUS = {
  active: { label: "Active", tone: "success" },
  past_due: { label: "Payment failed", tone: "danger" },
  pending: { label: "Waiting for payment", tone: "warning" },
  expired: { label: "Ended", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

/** The plan the business is on, where it is billed, usage this month, and where to manage it. */
export function CurrentPlanCard({ billing }: { billing: BillingResponse }) {
  const theme = useTheme();
  const toast = useToast();
  const { state } = billing;
  const sub = state.subscription;
  const { leads, photos } = state.limits;
  const status = sub ? STATUS[sub.status] : null;
  const renewal = sub?.endDate ? `${sub.cancelAtPeriodEnd || sub.source === "admin" ? "Ends" : "Renews"} on ${formatDate(sub.endDate)}` : null;

  const manageInStore = (): void => {
    openStoreSubscriptions().catch((error: unknown) => {
      if (billing.manageUrl) void Linking.openURL(billing.manageUrl);
      else toast(errorMessage(error), "error");
    });
  };

  return (
    <AppCard>
      <View style={{ gap: theme.spacing[4] }}>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.lg }]}>
            <Crown size={24} color={theme.colors.brand.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="overline" tone="tertiary">
              Current plan
            </AppText>
            <View style={[styles.row, { gap: theme.spacing[2] }]}>
              <AppText variant="heading" numberOfLines={1}>
                {state.plan.name}
              </AppText>
              {status ? <AppBadge label={status.label} tone={status.tone} /> : null}
            </View>
            <AppText variant="caption" tone="secondary">
              {sub ? [SOURCE_LABEL[sub.source], renewal].filter(Boolean).join(" · ") : "Free forever. Upgrade any time."}
            </AppText>
          </View>
        </View>

        <View style={[styles.usage, { gap: theme.spacing[4] }]}>
          <View>
            <AppText variant="caption" tone="tertiary">
              Leads this month
            </AppText>
            <AppText variant="label">{leads.limit === null ? `${leads.used} · unlimited` : `${Math.min(leads.used, leads.limit)} of ${leads.limit}`}</AppText>
          </View>
          <View>
            <AppText variant="caption" tone="tertiary">
              Photos
            </AppText>
            <AppText variant="label">{photos.limit === null ? `${photos.used} · unlimited` : `${photos.used} of ${photos.limit}`}</AppText>
          </View>
        </View>

        {billing.managedIn === "app_store" || billing.managedIn === "play_store" ? (
          <AppButton variant="secondary" onPress={manageInStore}>
            {billing.managedIn === "app_store" ? "Manage in the App Store" : "Manage in Google Play"}
          </AppButton>
        ) : billing.managedIn === "web" ? (
          <AppButton variant="secondary" onPress={() => void openUrl(`${PROVIDER_WEB_URL}/subscription`)}>
            Manage on the website
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  icon: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  flex: { flex: 1, gap: 2 },
  usage: { flexDirection: "row", flexWrap: "wrap" },
});
