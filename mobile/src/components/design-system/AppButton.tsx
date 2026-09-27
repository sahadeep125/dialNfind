import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

export type ButtonVariant =
  "primary" | "secondary" | "soft" | "success" | "destructive" | "ghost" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon before the label, colored to match the variant. */
  icon?: LucideIcon;
  /** Custom leading content (e.g. a brand logo) when a Lucide icon does not fit. */
  leadingIcon?: ReactNode;
  trailingIcon?: LucideIcon;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 15, md: 18, lg: 19 };

export function AppButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon: Icon,
  leadingIcon,
  trailingIcon: Trailing,
  fullWidth = false,
  style,
  ...props
}: Props) {
  const theme = useTheme();
  const tokens = theme.components.button[variant];
  const inactive = disabled || loading;
  const raised = (variant === "primary" || variant === "success") && !disabled;

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
          borderRadius: theme.components.button.radius,
          height: theme.components.button.height[size],
          paddingHorizontal: size === "sm" ? theme.spacing[3] : theme.spacing[5],
          gap: size === "sm" ? theme.spacing[1.5] : theme.spacing[2],
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: disabled ? 0.45 : 1,
        },
        raised && theme.mode === "light"
          ? variant === "success"
            ? styles.raisedSuccess
            : styles.raised
          : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.text} size="small" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {Icon ? <Icon size={ICON_SIZE[size]} color={tokens.text} strokeWidth={2.2} /> : null}
          {leadingIcon ? <View>{leadingIcon}</View> : null}
          <AppText
            variant={size === "sm" ? "labelSmall" : "label"}
            numberOfLines={1}
            style={[{ color: tokens.text }, size === "lg" ? styles.lgLabel : null]}
          >
            {children}
          </AppText>
          {Trailing ? (
            <Trailing size={ICON_SIZE[size]} color={tokens.text} strokeWidth={2.2} />
          ) : null}
        </View>
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
  raised: { boxShadow: "0 4px 12px rgba(53, 94, 221, 0.22)" },
  raisedSuccess: { boxShadow: "0 4px 12px rgba(0, 152, 108, 0.22)" },
  lgLabel: { fontSize: 16 },
});
