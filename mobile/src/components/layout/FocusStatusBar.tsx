import { useIsFocused } from "expo-router";
import { StatusBar, type StatusBarStyle } from "expo-status-bar";

/**
 * Overrides the status bar style while this screen is focused, for screens that start on a dark
 * surface (brand hero, cover photo). Tabs stay mounted, so it only renders while focused.
 */
export function FocusStatusBar({ style }: { style: StatusBarStyle }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}
