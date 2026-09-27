import { StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  value: number;
  onChange: (rating: number) => void;
}

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Five large stars for choosing a rating, each a full touch target. */
export function StarPicker({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={styles.row}
        accessibilityRole="adjustable"
        accessibilityLabel="Rating"
        accessibilityValue={{ min: 0, max: 5, now: value }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <AppPressable
            key={i}
            haptic
            accessibilityRole="button"
            accessibilityLabel={`${i} star${i > 1 ? "s" : ""}`}
            onPress={() => onChange(i)}
            style={styles.star}
          >
            <Star
              size={40}
              color={i <= value ? theme.colors.star : theme.colors.border.secondary}
              fill={i <= value ? theme.colors.star : "transparent"}
              strokeWidth={1.6}
            />
          </AppPressable>
        ))}
      </View>
      <AppText variant="subheading" tone={value ? "primary" : "tertiary"}>
        {value ? LABELS[value] : "Tap a star to rate"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6 },
  row: { flexDirection: "row", gap: 2 },
  star: { alignItems: "center", height: 52, justifyContent: "center", width: 52 },
});
