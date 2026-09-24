// Brand palette, matched to the DialNFind website. Leaf file: no imports, so tailwind.config.ts can read it.

export const palette = {
  indigo50: "#EEF3FF",
  indigo100: "#EAF0FE",
  indigo200: "#C9D7FC",
  indigo500: "#355EDD",
  indigo600: "#264AC9",
  indigo700: "#1F3A8B",
  indigo900: "#142152",
  indigo400: "#618BF9",
  teal500: "#08B6AF",
  teal100: "#D8F6F4",
  green600: "#00986C",
  green700: "#005D3F",
  green100: "#DDFAEC",
  amber500: "#EB9F2C",
  amber800: "#7D460B",
  amber100: "#FFF4D7",
  red600: "#DF202E",
  red100: "#FDE7E8",
  slate0: "#FFFFFF",
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
  nightAccent: "#1D2842",
} as const;

export interface ColorScheme {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
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
  overlay: string;
  star: string;
}

export const lightColors: ColorScheme = {
  background: {
    primary: palette.slate25,
    secondary: palette.slate0,
    tertiary: palette.slate50,
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
  border: { primary: palette.slate200, secondary: palette.slate300, tertiary: palette.slate50 },
  brand: {
    primary: palette.indigo500,
    pressed: palette.indigo600,
    soft: palette.indigo100,
    softText: palette.indigo700,
    deep: palette.indigo900,
    accent: palette.teal500,
  },
  semantic: {
    success: palette.green600,
    successSoft: palette.green100,
    warning: palette.amber500,
    warningSoft: palette.amber100,
    warningText: palette.amber800,
    danger: palette.red600,
    dangerSoft: palette.red100,
    info: palette.indigo500,
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
    primary: palette.indigo400,
    pressed: palette.indigo500,
    soft: palette.nightAccent,
    softText: palette.indigo200,
    deep: palette.indigo200,
    accent: palette.teal500,
  },
  semantic: {
    success: "#2BC592",
    successSoft: "#0E2A22",
    warning: "#F2B452",
    warningSoft: "#2E2410",
    warningText: "#F2C987",
    danger: "#F25561",
    dangerSoft: "#351519",
    info: palette.indigo400,
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
