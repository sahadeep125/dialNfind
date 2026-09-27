import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";

export type CardVariant = "raised" | "outlined" | "flat" | "tinted";

interface Props {
  children: ReactNode;
  /**
   * raised: white surface with a soft shadow (default). outlined: hairline border, no shadow.
   * flat: quiet fill for secondary content. tinted: brand wash for callouts.
   */
  variant?: CardVariant;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Surface for grouped content. Pass onPress to make the whole card tappable. */
export function AppCard({
  children,
  variant = "raised",
  padding,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const theme = useTheme();
  const tokens = theme.components.card;
  const dark = theme.mode === "dark";
  const background =
    variant === "tinted"
      ? theme.colors.background.elevated
      : variant === "flat"
        ? theme.colors.background.tertiary
        : tokens.background;
  // In light mode a raised card is defined by its shadow; dark surfaces need an edge instead.
  const border =
    variant === "outlined" || (variant === "raised" && dark) ? tokens.border : background;
  const surface: ViewStyle = {
    backgroundColor: background,
    borderColor: border,
    borderCurve: "continuous",
    borderRadius: tokens.radius,
    borderWidth: 1,
    padding: padding ?? tokens.padding,
    ...(variant === "raised" ? theme.shadow.sm : null),
  };

  if (!onPress) return <View style={[surface, style]}>{children}</View>;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      scale={false}
      style={[
        surface,
        { overflow: "hidden" },
        style,
      ]}
    >
      {children}
    </AppPressable>
  );
}
