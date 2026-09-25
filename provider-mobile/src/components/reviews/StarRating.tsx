import { StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  rating: number;
  size?: number;
}

/** Five stars filled to the nearest half-up whole star. Read-only. */
export function StarRating({ rating, size = 14 }: Props) {
  const theme = useTheme();
  const filled = Math.round(rating);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5`}
      style={styles.row}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= filled ? theme.colors.star : theme.colors.border.secondary}
          fill={i <= filled ? theme.colors.star : "transparent"}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
