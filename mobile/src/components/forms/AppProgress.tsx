import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  /** 0 to 100. */
  value: number;
  tone?: "brand" | "success" | "warning";
  height?: number;
}

export function AppProgress({ value, tone = "brand", height = 8 }: Props) {
  const theme = useTheme();
  const color =
    tone === "success"
      ? theme.colors.semantic.success
      : tone === "warning"
        ? theme.colors.semantic.warning
        : theme.colors.brand.primary;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.colors.background.tertiary },
      ]}
    >
      <View
        style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden", width: "100%" },
});
