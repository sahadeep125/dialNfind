import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Check, Crown } from "lucide-react-native";

import { AppBadge, AppButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { BillingCycle, Plan } from "@/types/billing";

interface Props {
  plan: Plan;
  /** Localized store price, or the website price when the store has none. */
  priceLabel: string;
  period: BillingCycle | null;
  isCurrent: boolean;
  featured: boolean;
  /** Null hides the button (the Free card while on a paid plan). */
  actionLabel: string | null;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}

export const PlanCard = memo(function PlanCard({ plan, priceLabel, period, isCurrent, featured, actionLabel, busy, disabled, onChoose }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        theme.shadow.card,
        {
          backgroundColor: isCurrent ? theme.colors.brand.soft : theme.components.card.background,
          borderColor: featured ? theme.colors.brand.primary : theme.components.card.border,
          borderWidth: featured ? theme.borderWidth.focus : theme.borderWidth.default,
          borderRadius: theme.components.card.radius,
          padding: theme.spacing[5],
          gap: theme.spacing[4],
        },
      ]}
    >
      <View style={[styles.head, { gap: theme.spacing[2] }]}>
        {plan.code !== "free" ? <Crown size={18} color={theme.colors.brand.primary} /> : null}
        <AppText variant="subheading" style={styles.flex}>
          {plan.name}
        </AppText>
        {featured ? <AppBadge label="Most popular" tone="brand" /> : null}
        {isCurrent ? <AppBadge label="Your plan" tone="success" /> : null}
      </View>
      <View style={[styles.price, { gap: theme.spacing[1] }]}>
        <AppText variant="display">{priceLabel}</AppText>
        {period ? <AppText tone="secondary">/ {period === "yearly" ? "year" : "month"}</AppText> : null}
      </View>
      <View style={{ gap: theme.spacing[2] }}>
        {(plan.featuresJson ?? []).map((feature) => (
          <View key={feature} style={[styles.feature, { gap: theme.spacing[2] }]}>
            <Check size={16} color={theme.colors.semantic.success} style={styles.check} />
            <AppText style={styles.flex}>{feature}</AppText>
          </View>
        ))}
      </View>
      {actionLabel ? (
        <AppButton fullWidth variant={featured ? "primary" : "secondary"} disabled={disabled} loading={busy} onPress={onChoose}>
          {actionLabel}
        </AppButton>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flexBasis: 280, flexGrow: 1 },
  head: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  price: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  feature: { alignItems: "flex-start", flexDirection: "row" },
  check: { marginTop: 3 },
  flex: { flex: 1 },
});
