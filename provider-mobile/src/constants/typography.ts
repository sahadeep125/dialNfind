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
  md: 14,
  lg: 15,
  xl: 17,
  "2xl": 22,
  "3xl": 28,
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/**
 * Named text styles, from loudest to quietest. Sizes are scaled for the device at runtime by the theme.
 * - display: splash and sign-in only
 * - title: one per screen, the screen name
 * - heading: sheet titles and hero lines
 * - section: the name of a group of rows
 * - label: row titles, buttons, field labels
 * - body: sentences
 * - meta: times, counts, secondary facts under a label
 * - caption: pills and tiny UI text
 * - overline: uppercase group markers
 * - metric: numbers people scan for (KPIs, prices, ratings)
 */
export const typography = {
  display: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: fontSize["3xl"],
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize["2xl"],
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heading: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.xl,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  section: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: fontSize.lg,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.md, lineHeight: 20 },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.md, lineHeight: 20 },
  meta: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.xs, lineHeight: 16 },
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, lineHeight: 16 },
  overline: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize["2xs"],
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  metric: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: fontSize["2xl"],
    lineHeight: 28,
    letterSpacing: -0.5,
  },
} satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
