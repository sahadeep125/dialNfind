import { useId, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { palette } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Draw the two soft light rings in the corners. Off for small surfaces. */
  decorated?: boolean;
}

/**
 * The deep indigo brand surface: splash, onboarding, the Home hero and auth headers.
 * Text on it is white (AppText tone "white" / "whiteMuted").
 */
export function AppBrandSurface({ children, style, decorated = true }: Props) {
  const theme = useTheme();
  // Gradient ids must be unique per instance, or two surfaces on screen share one definition.
  const id = useId().replace(/:/g, "");
  const from = theme.mode === "dark" ? theme.colors.brand.ink : palette.indigo800;
  const to = theme.mode === "dark" ? "#0A1030" : palette.indigo950;
  return (
    <View style={[styles.base, { backgroundColor: to }, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
          <RadialGradient id={`glow${id}`} cx="85%" cy="0%" r="70%">
            <Stop offset="0" stopColor={palette.indigo400} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.indigo400} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#bg${id})`} />
        <Rect width="100%" height="100%" fill={`url(#glow${id})`} />
        {decorated ? (
          <>
            <Circle
              cx="92%"
              cy="8%"
              r="120"
              stroke="#FFFFFF"
              strokeOpacity={0.07}
              strokeWidth={1.5}
              fill="none"
            />
            <Circle
              cx="92%"
              cy="8%"
              r="190"
              stroke="#FFFFFF"
              strokeOpacity={0.05}
              strokeWidth={1.5}
              fill="none"
            />
            <Circle
              cx="-4%"
              cy="100%"
              r="140"
              stroke={palette.teal500}
              strokeOpacity={0.14}
              strokeWidth={1.5}
              fill="none"
            />
          </>
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
});
