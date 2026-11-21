// Brand palette, matched to the KaajVa website. Leaf file: no imports, so tailwind.config.ts can read it.
//
// Design language (from the KaajVa logo): a cool grey canvas with white surfaces on top, logo navy #042161
// for actions and brand moments (splash, hero, onboarding), logo orange #FD8003 as the accent.
// Orange is too light for white text, so text on orange uses navy, and orange text on light fills uses orange700.

export const palette = {
  navy25: "#F5F7FC",
  navy50: "#EEF2FA",
  navy100: "#E2E8F5",
  navy200: "#C7D2EC",
  navy300: "#9CAEDB",
  navy400: "#3F6FD1",
  navy500: "#042161",
  navy600: "#031B52",
  navy700: "#02174A",
  navy800: "#021442",
  navy900: "#011039",
  navy950: "#010B2B",
  orange500: "#FD8003",
  orange100: "#FFF1E2",
  orange700: "#9A4C00",
  green600: "#00986C",
  green700: "#005D3F",
  green100: "#DDFAEC",
  amber500: "#EB9F2C",
  amber800: "#7D460B",
  amber100: "#FFF4D7",
  red600: "#DF202E",
  red100: "#FDE7E8",
  slate0: "#FFFFFF",
  slate25: "#F8FAFC",
  slate50: "#F3F5F9",
  slate75: "#EDF0F5",
  slate100: "#E7EBF1",
  slate200: "#DFE3EA",
  slate300: "#CBD2DC",
  slate400: "#8A93A1",
  slate500: "#5E6878",
  slate700: "#343D4C",
  slate900: "#0F1828",
  night950: "#0A0E16",
  night900: "#121823",
  night850: "#171E2A",
  night800: "#1C2431",
  night700: "#28303D",
  night600: "#353E4C",
  night300: "#9DA5B1",
  night50: "#F0F2F5",
  nightAccent: "#16224A",
} as const;

export interface ColorScheme {
  background: {
    /** The canvas every screen sits on. */
    primary: string;
    /** Sheets and full-width bars. */
    secondary: string;
    /** Quiet fills: inputs, skeletons, inactive tracks. */
    tertiary: string;
    /** Cards and grouped lists that sit on the canvas. */
    elevated: string;
    inverse: string;
  };
  text: { primary: string; secondary: string; tertiary: string; inverse: string; disabled: string };
  border: { primary: string; secondary: string; tertiary: string };
  brand: {
    primary: string;
    pressed: string;
    soft: string;
    softText: string;
    deep: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    /** Deep brand surface for heroes, the splash and onboarding. Text on it is always white. */
    ink: string;
    inkSoft: string;
  };
  semantic: {
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    warningText: string;
    danger: string;
    dangerSoft: string;
    info: string;
  };
  /** Foregrounds that stay fixed in both themes: on the ink brand surface, and on frosted white discs over photos. */
  contrast: { onInk: string; onOverlay: string };
  overlay: string;
  star: string;
}

export const lightColors: ColorScheme = {
  background: {
    primary: palette.slate50,
    secondary: palette.slate0,
    tertiary: palette.slate75,
    elevated: palette.slate0,
    inverse: palette.slate900,
  },
  text: {
    primary: palette.slate900,
    secondary: palette.slate500,
    tertiary: palette.slate400,
    inverse: palette.slate0,
    disabled: palette.slate300,
  },
  border: { primary: palette.slate100, secondary: palette.slate200, tertiary: palette.slate75 },
  brand: {
    primary: palette.navy500,
    pressed: palette.navy600,
    soft: palette.navy50,
    softText: palette.navy700,
    deep: palette.navy900,
    accent: palette.orange500,
    accentSoft: palette.orange100,
    accentText: palette.orange700,
    ink: palette.navy900,
    inkSoft: palette.navy800,
  },
  semantic: {
    success: palette.green600,
    successSoft: palette.green100,
    warning: palette.amber500,
    warningSoft: palette.amber100,
    warningText: palette.amber800,
    danger: palette.red600,
    dangerSoft: palette.red100,
    info: palette.navy500,
  },
  contrast: { onInk: palette.slate0, onOverlay: palette.slate700 },
  overlay: "rgba(1, 16, 57, 0.48)",
  star: palette.amber500,
};

export const darkColors: ColorScheme = {
  background: {
    primary: palette.night950,
    secondary: palette.night900,
    tertiary: palette.night800,
    elevated: palette.night900,
    inverse: palette.night50,
  },
  text: {
    primary: palette.night50,
    secondary: palette.night300,
    tertiary: "#747D8A",
    inverse: palette.night950,
    disabled: palette.night600,
  },
  border: { primary: palette.night700, secondary: palette.night600, tertiary: palette.night800 },
  brand: {
    primary: palette.navy400,
    pressed: palette.navy500,
    soft: palette.nightAccent,
    softText: palette.navy200,
    deep: palette.navy200,
    accent: palette.orange500,
    accentSoft: "#3A2410",
    accentText: "#FFB066",
    ink: "#03185A",
    inkSoft: "#0A2670",
  },
  semantic: {
    success: "#2BC592",
    successSoft: "#0E2A22",
    warning: "#F2B452",
    warningSoft: "#2E2410",
    warningText: "#F2C987",
    danger: "#F25561",
    dangerSoft: "#351519",
    info: palette.navy400,
  },
  contrast: { onInk: palette.slate0, onOverlay: palette.slate700 },
  overlay: "rgba(0, 0, 0, 0.62)",
  star: "#F2B452",
};

/** Flattens a scheme to CSS variable names, e.g. background.primary -> --c-background-primary. Shared by Tailwind and the theme provider. */
export function colorVariables(scheme: ColorScheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [group, value] of Object.entries(scheme)) {
    if (typeof value === "string") out[`--c-${group}`] = value;
    else
      for (const [key, color] of Object.entries(value as Record<string, string>))
        out[`--c-${group}-${key}`] = color;
  }
  return out;
}
