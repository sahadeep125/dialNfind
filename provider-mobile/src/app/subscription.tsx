import { Fragment, useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Receipt } from "lucide-react-native";

import {
  AppButton,
  AppCard,
  AppDivider,
  AppSheet,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader, SectionHeader } from "@/components/layout";
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard";
import { PlanCard } from "@/components/subscription/PlanCard";
import { TransactionRow } from "@/components/subscription/TransactionRow";
import { useRequestPlan, useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Plan } from "@/types/billing";
import { formatPrice } from "@/utils/format";

const POPULAR_PLAN = "Pro";

export default function SubscriptionScreen() {
  const theme = useTheme();
  const toast = useToast();
  const subscription = useSubscription();
  const request = useRequestPlan();
  const [choosing, setChoosing] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const data = subscription.data;
  const current = data?.current ?? null;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await subscription.refetch();
    setRefreshing(false);
  };

  const onChoose = useCallback((plan: Plan): void => setChoosing(plan), []);

  const confirmPlan = (): void => {
    if (!choosing) return;
    const plan = choosing;
    request.mutate(plan.id, {
      onSuccess: ({ ticket }) => {
        setChoosing(null);
        toast(
          `Request sent (${ticket.reference}). Our team will contact you to arrange payment and switch your plan.`,
          "success",
        );
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Plan and billing" />
      {subscription.isError && !data ? (
        <ErrorState error={subscription.error} onRetry={() => void subscription.refetch()} />
      ) : !data ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <AppSkeleton shape="block" height={110} />
          <AppSkeleton shape="block" height={260} />
          <AppSkeleton shape="block" height={260} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing[4],
            gap: theme.spacing[5],
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
          <AppText tone="secondary">
            Every plan keeps your listing free to find. Paid plans add reach, analytics and a
            partner badge. Send a request and our team will contact you to arrange payment.
          </AppText>

          {current ? (
            <CurrentPlanCard current={current} />
          ) : null}

          <View style={[styles.grid, { gap: theme.spacing[4] }]}>
            {data.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={current?.plan.id === plan.id}
                featured={plan.name === POPULAR_PLAN}
                busy={request.isPending && request.variables === plan.id}
                disabled={request.isPending}
                onChoose={onChoose}
              />
            ))}
          </View>

          <View style={{ gap: theme.spacing[3] }}>
            <SectionHeader title="Billing history" />
            <AppCard padding={0}>
              {data.transactions.length === 0 ? (
                <View style={[styles.empty, { gap: theme.spacing[2], padding: theme.spacing[4] }]}>
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

      <AppSheet
        visible={!!choosing}
        onClose={() => setChoosing(null)}
        title={choosing ? `Request the ${choosing.name} plan?` : ""}
      >
        {choosing ? (
          <View style={[styles.sheet, { gap: theme.spacing[4], padding: theme.spacing[4] }]}>
            <AppText tone="secondary">
              {choosing.price > 0
                ? `The ${choosing.name} plan costs ${formatPrice(choosing.price)} per ${choosing.billingCycle === "yearly" ? "year" : "month"}. We will contact you to arrange payment, then switch your plan.`
                : `We will move your listing to the free ${choosing.name} plan.`}
            </AppText>
            <View style={[styles.row, { gap: theme.spacing[3] }]}>
              <AppButton variant="secondary" style={styles.flex} onPress={() => setChoosing(null)}>
                Cancel
              </AppButton>
              <AppButton style={styles.flex} loading={request.isPending} onPress={confirmPlan}>
                Send request
              </AppButton>
            </View>
          </View>
        ) : null}
      </AppSheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  empty: { alignItems: "center", flexDirection: "row" },
  sheet: { paddingTop: 0 },
  row: { flexDirection: "row" },
  flex: { flex: 1 },
});
