// Composition root for design tokens: colors, spacing, type and per-component tokens for light and dark.
import { moderateScale } from "react-native-size-matters";

import { darkColors, lightColors, type ColorScheme } from "./colors";
import { borderWidth, radius, spacing } from "./spacing";
import { typography, type TypeStyle, type TypographyVariant } from "./typography";

const scaleType = (style: TypeStyle): TypeStyle => ({
  ...style,
  fontSize: Math.round(moderateScale(style.fontSize, 0.3)),
  lineHeight: Math.round(moderateScale(style.lineHeight, 0.3)),
});

function buildTheme(colors: ColorScheme, mode: "light" | "dark") {
  return {
    mode,
    colors,
    spacing,
    radius,
    borderWidth,
    typography: Object.fromEntries(
      Object.entries(typography).map(([k, v]) => [k, scaleType(v)]),
    ) as Record<TypographyVariant, TypeStyle>,
    shadow: {
      card:
        mode === "light"
          ? {
              shadowColor: "#0F1828",
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }
          : {
              shadowColor: "#000000",
              shadowOpacity: 0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
              elevation: 0,
            },
    },
    components: {
      button: {
        radius: radius.md,
        height: {
          sm: Math.round(moderateScale(36, 0.3)),
          md: Math.round(moderateScale(46, 0.3)),
          lg: Math.round(moderateScale(52, 0.3)),
        },
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
          background: colors.brand.soft,
          pressed: colors.border.primary,
          text: colors.brand.softText,
          border: colors.brand.soft,
        },
        success: {
          background: colors.semantic.success,
          pressed: colors.semantic.success,
          text: "#FFFFFF",
          border: colors.semantic.success,
        },
        destructive: {
          background: colors.semantic.dangerSoft,
          pressed: colors.border.primary,
          text: colors.semantic.danger,
          border: colors.semantic.dangerSoft,
        },
        ghost: {
          background: "transparent",
          pressed: colors.background.tertiary,
          text: colors.text.primary,
          border: "transparent",
        },
      },
      input: {
        height: Math.round(moderateScale(48, 0.3)),
        radius: radius.md,
        paddingHorizontal: spacing[4],
        background: colors.background.elevated,
        border: colors.border.secondary,
        focusBorder: colors.brand.primary,
        errorBorder: colors.semantic.danger,
        placeholder: colors.text.tertiary,
      },
      card: {
        radius: radius.lg,
        padding: spacing[4],
        background: colors.background.elevated,
        border: colors.border.primary,
      },
      tabBar: { height: Math.round(moderateScale(58, 0.3)) },
    },
  };
}

export const lightTheme = buildTheme(lightColors, "light");
export const darkTheme = buildTheme(darkColors, "dark");
export const themes = { light: lightTheme, dark: darkTheme } as const;

export type AppTheme = typeof lightTheme;
export type ThemeMode = "light" | "dark";
