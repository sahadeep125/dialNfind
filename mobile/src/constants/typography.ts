// Font families and the type scale. Inter for text and Plus Jakarta Sans for headings, as on the website.
// Leaf file: no imports, so tailwind.config.ts can read it.

export const fontFamily = {
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  displayMedium: "PlusJakartaSans_500Medium",
  displaySemiBold: "PlusJakartaSans_600SemiBold",
  displayBold: "PlusJakartaSans_700Bold",
  displayExtraBold: "PlusJakartaSans_800ExtraBold",
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

export const fontSize = {
  "2xs": 11,
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/**
 * Named text styles. Sizes are scaled for the device at runtime by the theme.
 * Display styles (Plus Jakarta) are for headings only; everything people read at length is Inter.
 */
export const typography = {
  /** Splash, onboarding and hero headlines. */
  hero: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: fontSize["4xl"],
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  /** Tab screen titles and big numbers. */
  display: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: fontSize["3xl"],
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize["2xl"],
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  heading: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.xl,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  subheading: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: fontSize.lg,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  bodyLarge: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.lg, lineHeight: 25 },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.md, lineHeight: 22 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.md, lineHeight: 20 },
  /** Small emphasised text: chips, badges, meta values. */
  labelSmall: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, lineHeight: 18 },
  caption: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.sm, lineHeight: 18 },
  micro: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize["2xs"], lineHeight: 14 },
  overline: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.xs,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
} satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
