import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Building2, FileText, Receipt } from "lucide-react-native";

import {
  AppButton,
  AppListItem,
  AppPressable,
  AppSection,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
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
        toast(
          state.plan.code === "free"
            ? "No store subscription found for this account."
            : `Restored: you are on ${state.plan.name}.`,
          state.plan.code === "free" ? "info" : "success",
        ),
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Plan and billing" />
      {billing.isError && !data ? (
        <ErrorState error={billing.error} onRetry={() => void billing.refetch()} />
      ) : !data ? (
        <View style={{ padding: theme.layout.screenPadding, gap: theme.layout.sectionGap }}>
          <AppSkeleton shape="block" height={150} />
          <AppSkeleton shape="block" height={300} />
          <AppSkeleton shape="block" height={300} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingTop: theme.spacing[1],
            gap: theme.layout.sectionGap,
            paddingBottom: theme.spacing[10],
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.brand.primary}
            />
          }
        >
          <PlanBanner />
          <CurrentPlanCard billing={data} />

          <AppSection title="Plans" kind="plain">
            <PlanPicker billing={data} />
            {purchasesEnabled ? (
              <AppButton
                variant="ghost"
                size="sm"
                loading={restore.isPending}
                onPress={onRestore}
                style={{ alignSelf: "center" }}
              >
                Restore purchases
              </AppButton>
            ) : null}
          </AppSection>

          {data.invoices.length > 0 ? (
            <AppSection
              title="Invoices"
              footer="GST invoices are for plans paid on the website or to our team. App Store and Google Play send their own receipts."
            >
              {data.invoices.map((inv) => (
                <AppPressable
                  key={inv.id}
                  accessibilityRole="link"
                  accessibilityLabel={`Open invoice ${inv.number}`}
                  onPress={() => void openUrl(inv.pdfUrl)}
                  style={[
                    styles.row,
                    {
                      gap: theme.spacing[3],
                      paddingHorizontal: 14,
                      paddingVertical: theme.spacing[2.5],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tile,
                      {
                        backgroundColor: theme.colors.background.subtle,
                        borderRadius: theme.radius.sm + 2,
                      },
                    ]}
                  >
                    <FileText size={16} color={theme.colors.text.secondary} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="label" numberOfLines={1}>
                      {inv.number}
                      {inv.status === "void" ? "  (void)" : ""}
                    </AppText>
                    <AppText variant="meta">{`${formatDate(inv.issuedAt)} · incl. ${formatPrice(inv.tax)} GST`}</AppText>
                  </View>
                  <AppText variant="label" numeric>
                    {formatPrice(inv.total)}
                  </AppText>
                </AppPressable>
              ))}
            </AppSection>
          ) : null}

          <AppSection title="Billing details">
            <AppListItem
              title={data.billingProfile.billingName || "Add billing details"}
              subtitle={
                data.billingProfile.billingStateCode
                  ? [
                      data.billingProfile.gstin ? `GSTIN ${data.billingProfile.gstin}` : "No GSTIN",
                      data.billingProfile.billingAddress,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Name, address and GSTIN for your invoices"
              }
              leading={<Building2 size={16} color={theme.colors.text.secondary} />}
              onPress={() => setEditingBilling(true)}
            />
          </AppSection>

          <AppSection title="Payment history" dividerInset={14}>
            {data.transactions.length === 0 ? (
              <View style={[styles.row, { gap: theme.spacing[2], padding: 14 }]}>
                <Receipt size={16} color={theme.colors.text.tertiary} />
                <AppText variant="meta">No payments yet.</AppText>
              </View>
            ) : (
              data.transactions.map((t) => <TransactionRow key={t.id} transaction={t} />)
            )}
          </AppSection>
        </ScrollView>
      )}
      {data ? (
        <BillingDetailsSheet
          visible={editingBilling}
          profile={data.billingProfile}
          onClose={() => setEditingBilling(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1, gap: 2 },
  tile: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
});
