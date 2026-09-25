import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";

import { AppButton, AppCard, AppText } from "@/components/design-system";
import { FEATURE_COPY, planFor } from "@/constants/plans";
import { usePlan } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";

type Feature = keyof typeof FEATURE_COPY;

/** Explains what an upgrade unlocks, in place of a feature the plan does not include. */
export function LockedCard({ feature, compact }: { feature: Feature; compact?: boolean }) {
  const theme = useTheme();
  const copy = FEATURE_COPY[feature];
  return (
    <AppCard>
      <View style={[styles.body, { gap: theme.spacing[2] }]}>
        <View style={[styles.icon, { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.lg }]}>
          <Lock size={20} color={theme.colors.brand.primary} />
        </View>
        <AppText variant="subheading" align="center">
          {copy.title}
        </AppText>
        {!compact ? (
          <AppText tone="secondary" align="center">
            {copy.text}
          </AppText>
        ) : null}
        <AppButton size="sm" onPress={() => router.push({ pathname: "/paywall", params: { feature } })}>
          {`Upgrade to ${planFor(copy.entitlement)}`}
        </AppButton>
      </View>
    </AppCard>
  );
}

/** Its children when the plan includes the feature, otherwise a LockedCard. The server enforces the same rule. */
export function FeatureGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const plan = usePlan();
  if (plan.entitlements.includes(FEATURE_COPY[feature].entitlement)) return <>{children}</>;
  return <LockedCard feature={feature} />;
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingVertical: 8 },
  icon: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
});
