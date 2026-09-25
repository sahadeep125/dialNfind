import { StyleSheet, View } from "react-native";
import { CreditCard } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { CurrentSubscription } from "@/types/billing";
import { formatDate } from "@/utils/format";

interface Props {
  current: CurrentSubscription;
}

export function CurrentPlanCard({ current }: Props) {
  const theme = useTheme();
  const renewal = current.endDate ? `Active until ${formatDate(current.endDate)}` : "No end date";
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[4] }}>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <View
            style={[
              styles.icon,
              { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.lg },
            ]}
          >
            <CreditCard size={24} color={theme.colors.brand.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="overline" tone="tertiary">
              Current plan
            </AppText>
            <AppText variant="heading" numberOfLines={1}>
              {current.plan.name} plan
            </AppText>
            <AppText variant="caption" tone="secondary">
              {renewal}
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  icon: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  flex: { flex: 1, gap: 2 },
});
