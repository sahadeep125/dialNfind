// Composition root for design tokens: colors, spacing, type and per-component tokens for light and dark.
import type { ViewStyle } from "react-native";
import { moderateScale } from "react-native-size-matters";

import { darkColors, lightColors, type ColorScheme } from "./colors";
import { borderWidth, motion, radius, spacing } from "./spacing";
import { typography, type TypeStyle, type TypographyVariant } from "./typography";

const scaleType = (style: TypeStyle): TypeStyle => ({
  ...style,
  fontSize: Math.round(moderateScale(style.fontSize, 0.3)),
  lineHeight: Math.round(moderateScale(style.lineHeight, 0.3)),
});

const size = (value: number): number => Math.round(moderateScale(value, 0.3));

/** Three elevation levels. Dark mode leans on surface color instead of shadow, so shadows fade out there. */
function buildShadows(mode: "light" | "dark"): Record<"sm" | "md" | "lg", ViewStyle> {
  if (mode === "dark") {
    return {
      sm: {},
      md: { boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)" },
      lg: { boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)" },
    };
  }
  return {
    sm: { boxShadow: "0 1px 2px rgba(15, 24, 40, 0.04), 0 2px 8px rgba(15, 24, 40, 0.04)" },
    md: { boxShadow: "0 2px 4px rgba(15, 24, 40, 0.04), 0 8px 24px rgba(15, 24, 40, 0.08)" },
    lg: { boxShadow: "0 8px 16px rgba(12, 22, 56, 0.08), 0 20px 48px rgba(12, 22, 56, 0.16)" },
  };
}

function buildTheme(colors: ColorScheme, mode: "light" | "dark") {
  const shadows = buildShadows(mode);
  return {
    mode,
    colors,
    spacing,
    radius,
    borderWidth,
    motion,
    typography: Object.fromEntries(
      Object.entries(typography).map(([k, v]) => [k, scaleType(v)]),
    ) as Record<TypographyVariant, TypeStyle>,
    shadow: { ...shadows, card: shadows.sm },
    components: {
      button: {
        radius: radius.md,
        height: { sm: size(38), md: size(48), lg: size(54) },
        primary: {
          background: colors.brand.primary,
          pressed: colors.brand.pressed,
          text: "#FFFFFF",
          border: colors.brand.primary,
        },
        secondary: {
          background: colors.background.elevated,
          pressed: colors.background.tertiary,
          text: colors.text.primary,
          border: colors.border.secondary,
        },
        soft: {
          background:  mode === "light" ? colors.brand.soft : colors.brand.soft,
          pressed: mode === "light" ? "#DCE5FD" : "#253357",
          text: colors.brand.softText,
          border: colors.brand.soft,
        },
        success: {
          background: colors.semantic.success,
          pressed: mode === "light" ? "#008660" : "#23AE81",
          text: "#FFFFFF",
          border: colors.semantic.success,
        },
        destructive: {
          background: colors.semantic.dangerSoft,
          pressed: mode === "light" ? "#FAD5D8" : "#46191F",
          text: colors.semantic.danger,
          border: colors.semantic.dangerSoft,
        },
        ghost: {
          background: "transparent",
          pressed: colors.background.tertiary,
          text: colors.text.primary,
          border: "transparent",
        },
        /** White button on ink surfaces (hero, onboarding). */
        inverse: {
          background: "#FFFFFF",
          pressed: "#E9EEFB",
          text: colors.brand.ink,
          border: "#FFFFFF",
        },
      },
      input: {
        height: size(52),
        radius: radius.md,
        paddingHorizontal: spacing[4],
        background: colors.background.tertiary,
        focusBackground: colors.background.elevated,
        border: colors.background.tertiary,
        focusBorder: colors.brand.primary,
        errorBorder: colors.semantic.danger,
        placeholder: colors.text.tertiary,
      },
      card: {
        radius: radius.xl,
        padding: spacing[4],
        background: colors.background.elevated,
        border: colors.border.primary,
      },
      chip: {
        height: { sm: size(34), md: size(40) },
        background: colors.background.elevated,
        border: colors.border.secondary,
        selectedBackground: colors.brand.soft,
        selectedBorder: colors.brand.primary,
        selectedText: colors.brand.softText,
      },
      tabBar: { height: size(60) },
      sheet: { radius: radius["3xl"] },
    },
  };
}

export const lightTheme = buildTheme(lightColors, "light");
export const darkTheme = buildTheme(darkColors, "dark");
export const themes = { light: lightTheme, dark: darkTheme } as const;

export type AppTheme = typeof lightTheme;
export type ThemeMode = "light" | "dark";
