import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { palette } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";

export type CardVariant = "outlined" | "raised" | "flat" | "tinted" | "hero";

interface Props {
  children: ReactNode;
  /**
   * outlined: the default surface. flat: a subtle fill with no border, for blocks inside other surfaces.
   * tinted: brand-soft background. hero: the deep brand gradient with white text, one per screen at most.
   * raised is kept for older call sites and renders as outlined.
   */
  variant?: CardVariant;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Deep indigo gradient with a soft glow in the top-right corner, drawn once behind hero content. */
export function HeroBackground({ radius }: { radius: number }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.indigo600} />
            <Stop offset="1" stopColor={palette.indigo900} />
          </LinearGradient>
          <RadialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.indigo400} stopOpacity="0.55" />
            <Stop offset="1" stopColor={palette.indigo400} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hero-bg)" />
        <Circle cx="92%" cy="0%" r="160" fill="url(#hero-glow)" />
      </Svg>
    </View>
  );
}

/** Surface for grouped content. Pass onPress to make the whole card tappable. */
export function AppCard({
  children,
  variant = "outlined",
  padding,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const theme = useTheme();
  const tokens = theme.components.card;
  const background =
    variant === "tinted"
      ? theme.colors.brand.soft
      : variant === "flat"
        ? theme.colors.background.subtle
        : variant === "hero"
          ? palette.indigo700
          : tokens.background;
  const border = variant === "outlined" || variant === "raised" ? tokens.border : background;
  const surface: ViewStyle = {
    backgroundColor: background,
    borderColor: border,
    borderCurve: "continuous",
    borderRadius: tokens.radius,
    borderWidth: variant === "flat" || variant === "hero" ? 0 : 1,
    padding: padding ?? tokens.padding,
    overflow: variant === "hero" ? "hidden" : undefined,
  };
  const hero = variant === "hero" ? <HeroBackground radius={tokens.radius} /> : null;

  if (!onPress)
    return (
      <View style={[surface, style]}>
        {hero}
        {children}
      </View>
    );
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      scale={false}
      style={[surface, { overflow: "hidden" }, style]}
    >
      {hero}
      {children}
    </AppPressable>
  );
}
