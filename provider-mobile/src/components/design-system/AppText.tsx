import type { ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";

import type { TypographyVariant } from "@/constants/typography";
import { useTheme } from "@/hooks/useTheme";

export type TextTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "inverse"
  | "disabled"
  | "brand"
  | "danger"
  | "success"
  | "warning"
  | "white";

interface Props extends TextProps {
  children: ReactNode;
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle["textAlign"];
}

/** Every piece of text in the app goes through this, so type and color always come from the theme. */
export function AppText({
  children,
  variant = "body",
  tone = "primary",
  align,
  style,
  ...props
}: Props) {
  const theme = useTheme();
  const color: string =
    tone === "brand"
      ? theme.colors.brand.primary
      : tone === "danger"
        ? theme.colors.semantic.danger
        : tone === "success"
          ? theme.colors.semantic.success
          : tone === "warning"
            ? theme.colors.semantic.warningText
            : tone === "white"
              ? "#FFFFFF"
              : theme.colors.text[tone];

  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[theme.typography[variant], { color, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}
