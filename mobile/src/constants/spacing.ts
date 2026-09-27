// Spacing scale in points. Keys follow Tailwind (1 = 4pt) so `p-4` and `spacing[4]` mean the same thing.
// Leaf file: no imports, so tailwind.config.ts can read it.

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Corner radii. Controls (buttons, inputs, chips' containers) use `md`, cards use `xl`,
 * sheets and hero panels use `3xl`. Pair with borderCurve: "continuous".
 */
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  full: 9999,
} as const;

export const borderWidth = {
  hairline: 0.5,
  default: 1,
  focus: 1.5,
} as const;

/** Screen widths where the layout changes. Compact is a phone, medium a small tablet or a phone in landscape. */
export const breakpoints = {
  medium: 600,
  expanded: 900,
  wide: 1200,
} as const;

/** Horizontal page padding per size class. */
export const gutters = {
  compact: 16,
  medium: 24,
  expanded: 32,
} as const;

/** Reading width: forms, detail pages and settings never grow wider than this on tablets. */
export const MAX_CONTENT_WIDTH = 720;

/** Grid width: card lists and home can use more of a big tablet, but not all of it. */
export const MAX_GRID_WIDTH = 1200;

/** Auth and onboarding forms stay narrow so the eye does not travel. */
export const MAX_FORM_WIDTH = 460;

/** Minimum touch target recommended by Apple and Google. */
export const MIN_TOUCH_TARGET = 44;

/** Animation durations in ms, so motion across the app feels related. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
