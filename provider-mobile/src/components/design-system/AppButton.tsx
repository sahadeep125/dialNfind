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

export type ButtonVariant = "primary" | "secondary" | "soft" | "success" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

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

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      haptic
      {...props}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? tokens.pressed : tokens.background,
          borderColor: tokens.border,
          borderRadius: theme.components.button.radius,
          height: theme.components.button.height[size],
          paddingHorizontal: size === "sm" ? theme.spacing[3] : theme.spacing[5],
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: disabled ? 0.5 : 1,
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
            variant="label"
            numberOfLines={1}
            style={{
              color: tokens.text,
              fontSize: size === "sm" ? theme.typography.caption.fontSize : undefined,
            }}
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
    gap: 8,
    justifyContent: "center",
    overflow: "hidden",
  },
});
