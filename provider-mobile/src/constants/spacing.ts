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

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  "2xl": 22,
  full: 9999,
} as const;

/** Page rhythm shared by every screen, so all of them breathe the same way. */
export const layout = {
  screenPadding: 16,
  sectionGap: 20,
  groupGap: 8,
  rowMinHeight: 48,
  rowPaddingVertical: 10,
  iconTile: 32,
} as const;

export const borderWidth = {
  hairline: 0.5,
  default: 1,
  focus: 1.5,
} as const;

/** Content never grows wider than this on tablets, so lines stay readable. */
export const MAX_CONTENT_WIDTH = 720;

/** Minimum touch target recommended by Apple and Google. */
export const MIN_TOUCH_TARGET = 44;
