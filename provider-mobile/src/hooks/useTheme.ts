import { useColorScheme } from "react-native";

import { themes, type AppTheme } from "@/constants/theme";
import { useThemeStore } from "@/stores/useThemeStore";

/** The active theme: the person's choice from Settings, or the device setting when it is "system". */
export function useTheme(): AppTheme {
  const preference = useThemeStore((s) => s.preference);
  const system = useColorScheme();
  const mode = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  return themes[mode];
}
