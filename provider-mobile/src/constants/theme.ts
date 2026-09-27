// Composition root for design tokens: colors, spacing, type and per-component tokens for light and dark.
import { moderateScale } from "react-native-size-matters";

import { darkColors, lightColors, type ColorScheme } from "./colors";
import { borderWidth, layout, radius, spacing } from "./spacing";
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
    layout,
    borderWidth,
    typography: Object.fromEntries(
      Object.entries(typography).map(([k, v]) => [k, scaleType(v)]),
    ) as Record<TypographyVariant, TypeStyle>,
    shadow: {
      /** Resting surfaces are separated by borders, not shadows. Kept as a token so it can come back in one place. */
      card: {
        shadowColor: "#000000",
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      },
      /** Only for things that float above content: the save bar, toasts, segmented thumbs. */
      floating:
        mode === "light"
          ? {
              shadowColor: "#0F1828",
              shadowOpacity: 0.1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }
          : {
              shadowColor: "#000000",
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            },
      thumb:
        mode === "light"
          ? {
              shadowColor: "#0F1828",
              shadowOpacity: 0.08,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
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
          xs: Math.round(moderateScale(28, 0.3)),
          sm: Math.round(moderateScale(34, 0.3)),
          md: Math.round(moderateScale(44, 0.3)),
          lg: Math.round(moderateScale(48, 0.3)),
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
          border: colors.border.primary,
        },
        outline: {
          background: "transparent",
          pressed: colors.brand.soft,
          text: colors.brand.primary,
          border: colors.brand.primary,
        },
        neutral: {
          background: colors.background.subtle,
          pressed: colors.border.primary,
          text: colors.text.primary,
          border: colors.background.subtle,
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
          text: colors.semantic.dangerText,
          border: colors.semantic.dangerSoft,
        },
        danger: {
          background: colors.semantic.danger,
          pressed: colors.semantic.danger,
          text: "#FFFFFF",
          border: colors.semantic.danger,
        },
        ghost: {
          background: "transparent",
          pressed: colors.background.tertiary,
          text: colors.text.primary,
          border: "transparent",
        },
      },
      input: {
        height: Math.round(moderateScale(44, 0.3)),
        heightSm: Math.round(moderateScale(36, 0.3)),
        radius: radius.md,
        paddingHorizontal: spacing[3],
        background: colors.background.elevated,
        border: colors.border.primary,
        focusBorder: colors.brand.primary,
        errorBorder: colors.semantic.danger,
        placeholder: colors.text.tertiary,
      },
      card: {
        radius: radius.lg,
        padding: 14,
        background: colors.background.elevated,
        border: colors.border.primary,
      },
      tabBar: { height: Math.round(moderateScale(52, 0.3)) },
    },
  };
}

export const lightTheme = buildTheme(lightColors, "light");
export const darkTheme = buildTheme(darkColors, "dark");
export const themes = { light: lightTheme, dark: darkTheme } as const;

export type AppTheme = typeof lightTheme;
export type ThemeMode = "light" | "dark";
