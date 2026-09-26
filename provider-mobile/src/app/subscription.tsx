import { Fragment, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Building2, FileText, Receipt } from "lucide-react-native";

import { AppButton, AppCard, AppDivider, AppListItem, AppPressable, AppSkeleton, AppText } from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader, SectionHeader } from "@/components/layout";
import { BillingDetailsSheet } from "@/components/subscription/BillingDetailsSheet";
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard";
import { PlanBanner } from "@/components/subscription/PlanBanner";
import { PlanPicker } from "@/components/subscription/PlanPicker";
import { TransactionRow } from "@/components/subscription/TransactionRow";
import { useOfferings, useRestore } from "@/hooks/usePurchases";
import { useBilling } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";
import { purchasesEnabled } from "@/services/purchases";
import { formatDate, formatPrice } from "@/utils/format";

export default function SubscriptionScreen() {
  const theme = useTheme();
  const toast = useToast();
  const billing = useBilling();
  const offerings = useOfferings();
  const restore = useRestore();
  const [refreshing, setRefreshing] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const data = billing.data;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([billing.refetch(), purchasesEnabled ? offerings.refetch() : null]);
    setRefreshing(false);
  };

  const onRestore = (): void =>
    restore.mutate(undefined, {
      onSuccess: (state) =>
        toast(state.plan.code === "free" ? "No store subscription found for this account." : `Restored: you are on ${state.plan.name}.`, state.plan.code === "free" ? "info" : "success"),
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Plan and billing" />
      {billing.isError && !data ? (
        <ErrorState error={billing.error} onRetry={() => void billing.refetch()} />
      ) : !data ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <AppSkeleton shape="block" height={150} />
          <AppSkeleton shape="block" height={300} />
          <AppSkeleton shape="block" height={300} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[5], paddingBottom: theme.spacing[10] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.colors.brand.primary} />}
        >
          <PlanBanner />
          <CurrentPlanCard billing={data} />

          <View style={{ gap: theme.spacing[3] }}>
            <SectionHeader title="Plans" />
            <PlanPicker billing={data} />
            {purchasesEnabled ? (
              <AppButton variant="ghost" loading={restore.isPending} onPress={onRestore}>
                Restore purchases
              </AppButton>
            ) : null}
          </View>

          {data.invoices.length > 0 ? (
            <View style={{ gap: theme.spacing[3] }}>
              <SectionHeader title="Invoices" />
              <AppCard padding={0}>
                {data.invoices.map((inv, i) => (
                  <Fragment key={inv.id}>
                    {i > 0 ? <AppDivider /> : null}
                    <AppPressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open invoice ${inv.number}`}
                      onPress={() => void openUrl(inv.pdfUrl)}
                      style={[styles.row, { gap: theme.spacing[3], padding: theme.spacing[4] }]}
                    >
                      <FileText size={18} color={theme.colors.brand.primary} />
                      <View style={styles.flex}>
                        <AppText variant="label" numberOfLines={1}>
                          {inv.number}
                          {inv.status === "void" ? "  (void)" : ""}
                        </AppText>
                        <AppText variant="caption" tone="secondary">
                          {`${formatDate(inv.issuedAt)} · incl. ${formatPrice(inv.tax)} GST`}
                        </AppText>
                      </View>
                      <AppText variant="label">{formatPrice(inv.total)}</AppText>
                    </AppPressable>
                  </Fragment>
                ))}
              </AppCard>
              <AppText variant="caption" tone="tertiary">
                GST invoices are for plans paid on the website or to our team. For App Store and Google Play purchases, the store sends the receipt.
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: theme.spacing[3] }}>
            <SectionHeader title="Billing details" />
            <AppCard padding={0}>
              <AppListItem
                title={data.billingProfile.billingName || "Add billing details"}
                subtitle={
                  data.billingProfile.billingStateCode
                    ? [data.billingProfile.gstin ? `GSTIN ${data.billingProfile.gstin}` : "No GSTIN", data.billingProfile.billingAddress].filter(Boolean).join(" · ")
                    : "Name, address and GSTIN for your invoices"
                }
                leading={<Building2 size={18} color={theme.colors.brand.primary} />}
                onPress={() => setEditingBilling(true)}
              />
            </AppCard>
          </View>

          <View style={{ gap: theme.spacing[3] }}>
            <SectionHeader title="Payment history" />
            <AppCard padding={0}>
              {data.transactions.length === 0 ? (
                <View style={[styles.row, { gap: theme.spacing[2], padding: theme.spacing[4] }]}>
                  <Receipt size={16} color={theme.colors.text.secondary} />
                  <AppText tone="secondary">No payments yet.</AppText>
                </View>
              ) : (
                data.transactions.map((t, i) => (
                  <Fragment key={t.id}>
                    {i > 0 ? <AppDivider /> : null}
                    <TransactionRow transaction={t} />
                  </Fragment>
                ))
              )}
            </AppCard>
          </View>
        </ScrollView>
      )}
      {data ? <BillingDetailsSheet visible={editingBilling} profile={data.billingProfile} onClose={() => setEditingBilling(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1, gap: 2 },
});
