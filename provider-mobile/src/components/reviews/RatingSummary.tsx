import { StyleSheet, View } from "react-native";

import { AppCard, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ReviewsSummary } from "@/types/reviews";
import { plural } from "@/utils/format";
import { StarRating } from "./StarRating";

interface Props {
  summary: ReviewsSummary;
}

/** Average rating with a per-star breakdown. */
export function RatingSummary({ summary }: Props) {
  const theme = useTheme();
  const max = Math.max(1, ...summary.breakdown.map((b) => b.count));
  return (
    <AppCard>
      <View style={[styles.row, { gap: theme.spacing[5] }]}>
        <View style={[styles.score, { gap: theme.spacing[1] }]}>
          <AppText variant="display">
            {summary.totalReviews ? summary.avgRating.toFixed(1) : "-"}
          </AppText>
          <StarRating rating={summary.avgRating} />
          <AppText variant="caption" tone="secondary">
            {plural(summary.totalReviews, "review")}
          </AppText>
        </View>
        <View style={[styles.bars, { gap: theme.spacing[1.5] }]}>
          {summary.breakdown.map((b) => (
            <View
              key={b.rating}
              style={[styles.barRow, { gap: theme.spacing[2] }]}
              accessible
              accessibilityLabel={`${b.rating} star: ${b.count}`}
            >
              <AppText variant="caption" tone="secondary" style={styles.star}>
                {b.rating}
              </AppText>
              <View style={styles.bar}>
                <AppProgress value={(b.count / max) * 100} height={6} />
              </View>
              <AppText variant="caption" tone="secondary" align="right" style={styles.count}>
                {b.count}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  score: { alignItems: "flex-start" },
  bars: { flex: 1, minWidth: 0 },
  barRow: { alignItems: "center", flexDirection: "row" },
  star: { width: 10 },
  bar: { flex: 1 },
  count: { minWidth: 24, fontVariant: ["tabular-nums"] },
});
