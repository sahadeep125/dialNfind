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
import { useCancelAutoRenew, useCheckoutPlan, useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { Plan } from "@/types/billing";
import { formatDate, formatPrice } from "@/utils/format";

const POPULAR_PLAN = "Pro";

export default function SubscriptionScreen() {
  const theme = useTheme();
  const toast = useToast();
  const subscription = useSubscription();
  const checkout = useCheckoutPlan();
  const cancel = useCancelAutoRenew();
  const [choosing, setChoosing] = useState<Plan | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
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
    checkout.mutate(plan.id, {
      onSuccess: (result) => {
        setChoosing(null);
        toast(
          result.simulated
            ? "Plan changed. Payment was simulated because no gateway is connected yet."
            : "Plan changed",
          "success",
        );
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  const turnOffRenew = (): void => {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setConfirmCancel(false);
        toast("Auto-renew turned off. Your plan stays active until the end date.", "success");
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  const chosenEnd = (plan: Plan): string => {
    const end = new Date();
    if (plan.billingCycle === "yearly") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    return formatDate(end.toISOString());
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
            partner badge.
          </AppText>

          {current ? (
            <CurrentPlanCard
              current={current}
              busy={cancel.isPending}
              onTurnOffRenew={() => setConfirmCancel(true)}
            />
          ) : null}

          <View style={[styles.grid, { gap: theme.spacing[4] }]}>
            {data.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={current?.plan.id === plan.id}
                featured={plan.name === POPULAR_PLAN}
                currentPrice={current?.plan.price ?? null}
                busy={checkout.isPending && checkout.variables === plan.id}
                disabled={checkout.isPending}
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
        title={choosing ? `Switch to ${choosing.name}?` : ""}
      >
        {choosing ? (
          <View style={[styles.sheet, { gap: theme.spacing[4], padding: theme.spacing[4] }]}>
            <AppText tone="secondary">
              {choosing.price > 0
                ? `You pay ${formatPrice(choosing.price)} now and the ${choosing.name} plan runs until ${chosenEnd(choosing)}.`
                : `Your listing moves to the free ${choosing.name} plan straight away.`}
              {current ? ` Your ${current.plan.name} plan ends today.` : ""}
            </AppText>
            <View style={[styles.row, { gap: theme.spacing[3] }]}>
              <AppButton variant="secondary" style={styles.flex} onPress={() => setChoosing(null)}>
                Cancel
              </AppButton>
              <AppButton style={styles.flex} loading={checkout.isPending} onPress={confirmPlan}>
                {choosing.price > 0 ? `Pay ${formatPrice(choosing.price)}` : "Switch plan"}
              </AppButton>
            </View>
          </View>
        ) : null}
      </AppSheet>

      <AppSheet
        visible={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Turn off auto-renew?"
      >
        <View style={[styles.sheet, { gap: theme.spacing[4], padding: theme.spacing[4] }]}>
          <AppText tone="secondary">
            {current?.endDate
              ? `Your ${current.plan.name} plan stays active until ${formatDate(current.endDate)} and then stops.`
              : "Your plan will not renew."}
          </AppText>
          <View style={[styles.row, { gap: theme.spacing[3] }]}>
            <AppButton
              variant="secondary"
              style={styles.flex}
              onPress={() => setConfirmCancel(false)}
            >
              Keep it on
            </AppButton>
            <AppButton
              variant="destructive"
              style={styles.flex}
              loading={cancel.isPending}
              onPress={turnOffRenew}
            >
              Turn off
            </AppButton>
          </View>
        </View>
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
