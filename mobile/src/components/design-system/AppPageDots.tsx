import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { motion } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  count: number;
  index: number;
  /** "brand" on light surfaces, "inverse" on ink. */
  tone?: "brand" | "inverse";
}

function Dot({ active, on, off }: { active: boolean; on: string; off: string }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 8, { duration: motion.base }),
    backgroundColor: active ? on : off,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Page indicator for pagers: the current page stretches into a pill. */
export function AppPageDots({ count, index, tone = "brand" }: Props) {
  const theme = useTheme();
  const on = tone === "inverse" ? "#FFFFFF" : theme.colors.brand.primary;
  const off = tone === "inverse" ? "rgba(255, 255, 255, 0.3)" : theme.colors.border.secondary;
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Page ${index + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} on={on} off={off} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 6 },
  dot: { borderRadius: 4, height: 8 },
});
