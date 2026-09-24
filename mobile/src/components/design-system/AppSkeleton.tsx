import { useEffect } from "react";
import { type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  width?: DimensionValue;
  height?: number;
  shape?: "line" | "block" | "circle";
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder shown while content loads. Holds still when the device asks for reduced motion. */
export function AppSkeleton({ width = "100%", height = 14, shape = "line", style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const radius = shape === "circle" ? 9999 : shape === "block" ? theme.radius.md : 6;
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.background.tertiary },
        animated,
        style,
      ]}
    />
  );
}
