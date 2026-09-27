import type { ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";

import { fontFamily } from "@/constants/typography";
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
  /** Heavier body text without switching to a label. */
  weight?: "regular" | "medium" | "semibold" | "bold";
  /** Tabular figures, so numbers in lists and KPIs line up. */
  numeric?: boolean;
}

const WEIGHT = {
  regular: fontFamily.bodyRegular,
  medium: fontFamily.bodyMedium,
  semibold: fontFamily.bodySemiBold,
  bold: fontFamily.bodyBold,
} as const;

/** Every piece of text in the app goes through this, so type and color always come from the theme. */
export function AppText({
  children,
  variant = "body",
  tone,
  align,
  weight,
  numeric,
  style,
  ...props
}: Props) {
  const theme = useTheme();
  // Meta text reads as secondary information unless a tone says otherwise.
  const resolved: TextTone = tone ?? (variant === "meta" ? "tertiary" : "primary");
  const color: string =
    resolved === "brand"
      ? theme.colors.brand.primary
      : resolved === "danger"
        ? theme.colors.semantic.danger
        : resolved === "success"
          ? theme.colors.semantic.successText
          : resolved === "warning"
            ? theme.colors.semantic.warningText
            : resolved === "white"
              ? "#FFFFFF"
              : theme.colors.text[resolved];

  return (
    <Text
      maxFontSizeMultiplier={1.5}
      {...props}
      style={[
        theme.typography[variant],
        { color, textAlign: align },
        weight ? { fontFamily: WEIGHT[weight] } : null,
        numeric || variant === "metric" ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
