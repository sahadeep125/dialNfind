import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "soft"
  | "neutral"
  | "success"
  | "destructive"
  | "danger"
  | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One filled primary per screen; everything else is secondary, soft, neutral or ghost. */
export function AppButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  style,
  ...props
}: Props) {
  const theme = useTheme();
  const tokens = theme.components.button[variant];
  const inactive = disabled || loading;
  const small = size === "xs" || size === "sm";

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      haptic
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: tokens.background,
          borderColor: tokens.border,
          borderRadius: small ? theme.radius.sm : theme.components.button.radius,
          height: theme.components.button.height[size],
          paddingHorizontal:
            size === "xs"
              ? theme.spacing[2.5]
              : size === "sm"
                ? theme.spacing[3]
                : theme.spacing[4],
          gap: small ? 6 : 8,
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.text} size="small" />
      ) : (
        <>
          {leadingIcon ? <View>{leadingIcon}</View> : null}
          <AppText
            variant={small ? "caption" : "label"}
            numberOfLines={1}
            style={[
              { color: tokens.text },
              small ? { fontFamily: theme.typography.label.fontFamily } : null,
            ]}
          >
            {children}
          </AppText>
          {trailingIcon ? <View>{trailingIcon}</View> : null}
        </>
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    overflow: "hidden",
  },
});
