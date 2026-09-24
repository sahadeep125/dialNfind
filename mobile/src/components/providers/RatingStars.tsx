import { StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  rating: number;
  size?: number;
}

export function RatingStars({ rating, size = 14 }: Props) {
  const theme = useTheme();
  const rounded = Math.round(rating);
  return (
    <View style={styles.row} accessibilityLabel={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= rounded ? theme.colors.star : theme.colors.border.secondary}
          fill={i <= rounded ? theme.colors.star : theme.colors.border.secondary}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
