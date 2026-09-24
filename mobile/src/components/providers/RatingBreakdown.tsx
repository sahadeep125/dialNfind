import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderDetail } from "@/types";
import { plural } from "@/utils/format";
import { RatingStars } from "./RatingStars";

interface Props {
  rating: number;
  total: number;
  breakdown: ProviderDetail["ratingBreakdown"];
}

/** Big average score with a bar per star level. */
export function RatingBreakdown({ rating, total, breakdown }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.score}>
        <AppText variant="display">{total ? rating.toFixed(1) : "New"}</AppText>
        <RatingStars rating={rating} size={14} />
        <AppText variant="caption" tone="secondary">
          {plural(total, "review")}
        </AppText>
      </View>
      <View style={styles.bars}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown.find((b) => b.rating === star)?.count ?? 0;
          const pct = total ? (count / total) * 100 : 0;
          return (
            <View key={star} style={styles.barRow}>
              <AppText variant="caption" tone="secondary" style={styles.star}>
                {star}
              </AppText>
              <View style={[styles.track, { backgroundColor: theme.colors.background.tertiary }]}>
                <View
                  style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.colors.star }]}
                />
              </View>
              <AppText variant="caption" tone="tertiary" style={styles.count}>
                {count}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", flexDirection: "row", gap: 20 },
  score: { alignItems: "center", gap: 4 },
  bars: { flex: 1, gap: 4 },
  barRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  star: { width: 10 },
  track: { borderRadius: 4, flex: 1, height: 8, overflow: "hidden" },
  fill: { borderRadius: 4, height: 8 },
  count: { textAlign: "right", width: 24 },
});
