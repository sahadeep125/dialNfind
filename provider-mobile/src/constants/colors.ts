// Brand palette, matched to the KaajVa website. Leaf file: no imports, so tailwind.config.ts can read it.

export const palette = {
  navy50: "#EEF2FA",
  navy100: "#E2E8F5",
  navy200: "#C7D2EC",
  navy500: "#042161",
  navy600: "#031B52",
  navy700: "#02174A",
  navy900: "#011039",
  navy400: "#3F6FD1",
  orange500: "#FD8003",
  orange100: "#FFF1E2",
  orange800: "#9A4A00",
  green600: "#00986C",
  green700: "#005D3F",
  red700: "#B3141F",
  green100: "#DDFAEC",
  amber500: "#EB9F2C",
  amber800: "#7D460B",
  amber100: "#FFF4D7",
  red600: "#DF202E",
  red100: "#FDE7E8",
  slate0: "#FFFFFF",
  canvas: "#F5F7FA",
  slate75: "#EDF1F6",
  slate25: "#FBFDFE",
  slate50: "#F2F5F8",
  slate100: "#EFF4FC",
  slate200: "#DFE3EA",
  slate300: "#D9DEE6",
  slate400: "#88909C",
  slate500: "#606A78",
  slate900: "#0F1828",
  night950: "#0B0F18",
  night900: "#141B26",
  night800: "#1B2330",
  night700: "#272E3B",
  night600: "#343C4A",
  night300: "#9DA5B1",
  night50: "#F0F2F5",
  nightAccent: "#16224A",
} as const;

export interface ColorScheme {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    inverse: string;
    /** Neutral fill for icon tiles, tracks and inset blocks. Never tinted. */
    subtle: string;
  };
  text: { primary: string; secondary: string; tertiary: string; inverse: string; disabled: string };
  border: { primary: string; secondary: string; tertiary: string; strong: string };
  brand: {
    primary: string;
    pressed: string;
    soft: string;
    softText: string;
    deep: string;
    accent: string;
    /** Tint and text for the "Individual professional" badge. */
    accentSoft: string;
    accentText: string;
  };
  semantic: {
    success: string;
    successSoft: string;
    successText: string;
    warning: string;
    warningSoft: string;
    warningText: string;
    danger: string;
    dangerSoft: string;
    dangerText: string;
    info: string;
  };
  overlay: string;
  star: string;
}

export const lightColors: ColorScheme = {
  background: {
    primary: palette.canvas,
    secondary: palette.slate0,
    tertiary: palette.slate50,
    elevated: palette.slate0,
    inverse: palette.slate900,
    subtle: palette.slate75,
  },
  text: {
    primary: palette.slate900,
    secondary: palette.slate500,
    tertiary: palette.slate400,
    inverse: palette.slate0,
    disabled: palette.slate300,
  },
  border: {
    primary: palette.slate200,
    secondary: palette.slate300,
    tertiary: palette.slate50,
    strong: palette.slate400,
  },
  brand: {
    primary: palette.navy500,
    pressed: palette.navy600,
    soft: palette.navy100,
    softText: palette.navy700,
    deep: palette.navy900,
    accent: palette.orange500,
    accentSoft: palette.orange100,
    accentText: palette.orange800,
  },
  semantic: {
    success: palette.green600,
    successSoft: palette.green100,
    successText: palette.green700,
    warning: palette.amber500,
    warningSoft: palette.amber100,
    warningText: palette.amber800,
    danger: palette.red600,
    dangerSoft: palette.red100,
    dangerText: palette.red700,
    info: palette.navy500,
  },
  overlay: "rgba(15, 24, 40, 0.45)",
  star: palette.amber500,
};

export const darkColors: ColorScheme = {
  background: {
    primary: palette.night950,
    secondary: palette.night900,
    tertiary: palette.night800,
    elevated: palette.night900,
    inverse: palette.night50,
    subtle: palette.night800,
  },
  text: {
    primary: palette.night50,
    secondary: palette.night300,
    tertiary: "#747D8A",
    inverse: palette.night950,
    disabled: palette.night600,
  },
  border: {
    primary: palette.night700,
    secondary: palette.night600,
    tertiary: palette.night800,
    strong: palette.night300,
  },
  brand: {
    primary: palette.navy400,
    pressed: palette.navy500,
    soft: palette.nightAccent,
    softText: palette.navy200,
    deep: palette.navy200,
    accent: palette.orange500,
    accentSoft: "#3A2310",
    accentText: "#FFB766",
  },
  semantic: {
    success: "#2BC592",
    successSoft: "#0E2A22",
    successText: "#5FD9AE",
    warning: "#F2B452",
    warningSoft: "#2E2410",
    warningText: "#F2C987",
    danger: "#F25561",
    dangerSoft: "#351519",
    dangerText: "#FF8A93",
    info: palette.navy400,
  },
  overlay: "rgba(0, 0, 0, 0.6)",
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
