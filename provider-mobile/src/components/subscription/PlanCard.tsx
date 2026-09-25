import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { AppBadge, AppButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Plan } from "@/types/billing";
import { formatPrice } from "@/utils/format";

interface Props {
  plan: Plan;
  isCurrent: boolean;
  featured: boolean;
  /** The current plan's price, to word the button as an upgrade or a switch. */
  currentPrice: number | null;
  busy: boolean;
  disabled: boolean;
  onChoose: (plan: Plan) => void;
}

export const PlanCard = memo(function PlanCard({
  plan,
  isCurrent,
  featured,
  currentPrice,
  busy,
  disabled,
  onChoose,
}: Props) {
  const theme = useTheme();
  const label = isCurrent
    ? "Current plan"
    : currentPrice !== null && plan.price < currentPrice
      ? `Switch to ${plan.name}`
      : `Upgrade to ${plan.name}`;

  return (
    <View
      style={[
        styles.card,
        theme.shadow.card,
        {
          backgroundColor: theme.components.card.background,
          borderColor: featured ? theme.colors.brand.primary : theme.components.card.border,
          borderWidth: featured ? theme.borderWidth.focus : theme.borderWidth.default,
          borderRadius: theme.components.card.radius,
          padding: theme.spacing[5],
          gap: theme.spacing[4],
        },
      ]}
    >
      <View style={[styles.head, { gap: theme.spacing[2] }]}>
        <AppText variant="subheading" style={styles.flex}>
          {plan.name}
        </AppText>
        {featured ? <AppBadge label="Most popular" tone="brand" /> : null}
        {isCurrent ? <AppBadge label="Your plan" tone="success" /> : null}
      </View>
      <View style={[styles.price, { gap: theme.spacing[1] }]}>
        <AppText variant="display">{plan.price ? formatPrice(plan.price) : "Free"}</AppText>
        {plan.price > 0 ? (
          <AppText tone="secondary">/ {plan.billingCycle === "yearly" ? "year" : "month"}</AppText>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing[2] }}>
        {(plan.featuresJson ?? []).map((feature) => (
          <View key={feature} style={[styles.feature, { gap: theme.spacing[2] }]}>
            <Check size={16} color={theme.colors.semantic.success} style={styles.check} />
            <AppText style={styles.flex}>{feature}</AppText>
          </View>
        ))}
      </View>
      <AppButton
        fullWidth
        variant={featured ? "primary" : "secondary"}
        disabled={isCurrent || disabled}
        loading={busy}
        onPress={() => onChoose(plan)}
      >
        {label}
      </AppButton>
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
