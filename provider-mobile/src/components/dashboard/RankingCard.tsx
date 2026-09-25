import { StyleSheet, View } from "react-native";
import { Trophy } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  position: number;
  outOf: number;
  city: string;
}

export function RankingCard({ position, outOf, city }: Props) {
  const theme = useTheme();
  return (
    <AppCard variant="tinted">
      <View style={{ gap: theme.spacing[2] }}>
        <View style={[styles.row, { gap: theme.spacing[2] }]}>
          <Trophy size={16} color={theme.colors.semantic.warning} />
          <AppText variant="label" style={{ color: theme.colors.brand.softText }}>
            Ranking in {city}
          </AppText>
        </View>
        <View style={[styles.value, { gap: theme.spacing[2] }]}>
          <AppText variant="display" style={{ color: theme.colors.brand.deep }}>
            #{position}
          </AppText>
          <AppText tone="secondary" style={styles.shrink}>
            of {outOf} in your main category
          </AppText>
        </View>
        <AppText variant="caption" tone="secondary">
          Ranking uses your rating, reviews, verification, profile completeness and how often
          customers say you responded.
        </AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  value: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  shrink: { flexShrink: 1 },
});
