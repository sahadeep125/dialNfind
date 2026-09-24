import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { MIN_TOUCH_TARGET } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";

interface Props {
  accessibilityLabel: string;
  icon: ReactNode;
  onPress?: () => void;
  variant?: "filled" | "soft" | "ghost" | "surface";
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
  const background =
    variant === "filled"
      ? theme.colors.brand.primary
      : variant === "soft"
        ? theme.colors.brand.soft
        : variant === "surface"
          ? theme.colors.background.elevated
          : "transparent";

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
          backgroundColor: background,
          opacity: disabled ? 0.5 : 1,
        },
        variant === "surface" ? { borderWidth: 1, borderColor: theme.colors.border.primary } : null,
        style,
      ]}
    >
      {icon}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: 9999, justifyContent: "center", overflow: "hidden" },
});
