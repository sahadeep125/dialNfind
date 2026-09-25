import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Crown, X } from "lucide-react-native";

import { AppButton, AppIconButton, AppPressable, AppSkeleton, AppText } from "@/components/design-system";
import { ErrorState, Screen } from "@/components/layout";
import { PlanPicker } from "@/components/subscription/PlanPicker";
import { FEATURE_COPY } from "@/constants/plans";
import { useRestore } from "@/hooks/usePurchases";
import { useBilling } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { purchasesEnabled } from "@/services/purchases";

/**
 * The upgrade screen, opened from locked features, the Free plan banner, and whenever the server
 * says a feature needs a higher plan (?feature= names it).
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const copy = feature ? FEATURE_COPY[feature] : undefined;
  const billing = useBilling();
  const restore = useRestore();
  const close = (): void => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={[styles.top, { padding: theme.spacing[2] }]}>
        <AppIconButton accessibilityLabel="Close" variant="ghost" onPress={close} icon={<X size={22} color={theme.colors.text.primary} />} />
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingTop: 0, gap: theme.spacing[5], paddingBottom: theme.spacing[10] }}>
        <View style={[styles.hero, { gap: theme.spacing[2] }]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.xl }]}>
            <Crown size={28} color={theme.colors.brand.primary} />
          </View>
          <AppText variant="title" align="center">
            {copy?.title ?? "Grow faster with Pro"}
          </AppText>
          <AppText tone="secondary" align="center">
            {copy?.text ?? "Every lead in full, profile analytics, a WhatsApp button and a partner badge that lifts you in search."}
          </AppText>
        </View>

        {billing.isError && !billing.data ? (
          <ErrorState error={billing.error} onRetry={() => void billing.refetch()} />
        ) : !billing.data ? (
          <View style={{ gap: theme.spacing[4] }}>
            <AppSkeleton shape="block" height={300} />
            <AppSkeleton shape="block" height={300} />
          </View>
        ) : (
          <PlanPicker billing={billing.data} paidOnly onPurchased={close} />
        )}

        {purchasesEnabled ? (
          <AppButton
            variant="ghost"
            loading={restore.isPending}
            onPress={() =>
              restore.mutate(undefined, {
                onSuccess: (state) => {
                  if (state.plan.code === "free") return toast("No store subscription found for this account.", "info");
                  toast(`Restored: you are on ${state.plan.name}.`, "success");
                  close();
                },
                onError: (error: Error) => toast(errorMessage(error), "error"),
              })
            }
          >
            Restore purchases
          </AppButton>
        ) : null}

        <View style={[styles.links, { gap: theme.spacing[4] }]}>
          <AppPressable accessibilityRole="link" onPress={() => router.push("/legal/terms")}>
            <AppText variant="caption" tone="secondary">
              Terms of use
            </AppText>
          </AppPressable>
          <AppPressable accessibilityRole="link" onPress={() => router.push("/legal/privacy")}>
            <AppText variant="caption" tone="secondary">
              Privacy policy
            </AppText>
          </AppPressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: "flex-end" },
  hero: { alignItems: "center" },
  icon: { alignItems: "center", height: 60, justifyContent: "center", width: 60 },
  links: { flexDirection: "row", justifyContent: "center" },
});
