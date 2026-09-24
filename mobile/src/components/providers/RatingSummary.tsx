import { StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  rating: number;
  count: number;
}

/** "4.6 (128)" with a star, or "New" when there are no reviews yet. */
export function RatingSummary({ rating, count }: Props) {
  const theme = useTheme();
  if (!count) {
    return (
      <AppText variant="caption" tone="secondary">
        No reviews yet
      </AppText>
    );
  }
  return (
    <View
      style={styles.row}
      accessibilityLabel={`Rated ${rating.toFixed(1)} from ${count} reviews`}
    >
      <Star size={14} color={theme.colors.star} fill={theme.colors.star} />
      <AppText variant="caption" style={{ fontFamily: theme.typography.label.fontFamily }}>
        {Number(rating).toFixed(1)}
      </AppText>
      <AppText variant="caption" tone="secondary">
        ({count.toLocaleString("en-IN")})
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 4 },
});
