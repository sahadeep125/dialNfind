import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { MIN_TOUCH_TARGET } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";

export type IconButtonVariant = "filled" | "soft" | "ghost" | "surface" | "overlay" | "inverse";

interface Props {
  accessibilityLabel: string;
  icon: ReactNode;
  onPress?: () => void;
  /**
   * surface: white disc with an edge, for the canvas. overlay: frosted white disc over photos.
   * inverse: translucent disc on ink surfaces (hero, onboarding).
   */
  variant?: IconButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button with a guaranteed 44pt touch target. */
export function AppIconButton({
  accessibilityLabel,
  icon,
  onPress,
  variant = "ghost",
  size = "md",
  disabled,
  style,
}: Props) {
  const theme = useTheme();
  const dimension = size === "sm" ? 36 : MIN_TOUCH_TARGET;
  const background: Record<IconButtonVariant, string> = {
    filled: theme.colors.brand.primary,
    soft: theme.colors.brand.soft,
    surface: theme.colors.background.elevated,
    overlay: "rgba(255, 255, 255, 0.94)",
    inverse: "rgba(255, 255, 255, 0.14)",
    ghost: "transparent",
  };

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      haptic
      hitSlop={size === "sm" ? 4 : 0}
      onPress={onPress}
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          backgroundColor: background[variant],
          opacity: disabled ? 0.5 : 1,
        },
        variant === "surface"
          ? [{ borderWidth: 1, borderColor: theme.colors.border.primary }, theme.shadow.sm]
          : null,
        variant === "overlay" ? styles.overlay : null,
        variant === "inverse" ? styles.inverse : null,
        style,
      ]}
    >
      {icon}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: 9999, justifyContent: "center", overflow: "hidden" },
  overlay: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)" },
  inverse: { borderColor: "rgba(255, 255, 255, 0.18)", borderWidth: 1 },
});
