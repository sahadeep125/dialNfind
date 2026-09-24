import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";

interface Props {
  children: ReactNode;
  variant?: "raised" | "flat" | "tinted";
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
  const surface: ViewStyle = {
    backgroundColor: variant === "tinted" ? theme.colors.brand.soft : tokens.background,
    borderColor: variant === "tinted" ? theme.colors.brand.soft : tokens.border,
    borderCurve: "continuous",
    borderRadius: tokens.radius,
    borderWidth: 1,
    padding: padding ?? tokens.padding,
    ...(variant === "raised" ? theme.shadow.card : null),
  };

  if (!onPress) return <View style={[surface, style]}>{children}</View>;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      scale={false}
      style={[surface, { overflow: "hidden" }, style]}
    >
      {children}
    </AppPressable>
  );
}
