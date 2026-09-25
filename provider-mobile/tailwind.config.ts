// Tailwind (NativeWind) config generated from the same tokens the design-system components use.
// Colors resolve through CSS variables that ThemeProvider sets, so every class follows light and dark mode.
import type { Config } from "tailwindcss";

import { colorVariables, lightColors } from "./src/constants/colors";
import { radius, spacing } from "./src/constants/spacing";
import { fontFamily, fontSize } from "./src/constants/typography";

type ColorTree = Record<string, string | Record<string, string>>;

const colors: ColorTree = {};
for (const name of Object.keys(colorVariables(lightColors))) {
  const [group, key] = name.replace("--c-", "").split("-");
  if (!key) colors[group] = `var(${name})`;
  else
    colors[group] = { ...((colors[group] as Record<string, string>) ?? {}), [key]: `var(${name})` };
}

const px = (scale: Record<string | number, number>): Record<string, string> =>
  Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, `${v}px`]));

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    colors: { transparent: "transparent", white: "#FFFFFF", black: "#000000", ...colors },
    spacing: px(spacing),
    borderRadius: px(radius),
    fontSize: px(fontSize),
    fontFamily: Object.fromEntries(Object.entries(fontFamily).map(([k, v]) => [k, [v]])),
    extend: {},
  },
  plugins: [],
} satisfies Config;
