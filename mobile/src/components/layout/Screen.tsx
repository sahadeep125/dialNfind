import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { MAX_CONTENT_WIDTH, MAX_GRID_WIDTH } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";

export type ScreenWidth = "content" | "grid" | "full";

interface Props {
  children: ReactNode;
  edges?: Edge[];
  /**
   * How wide content may grow on tablets. content: a readable column (forms, details, settings).
   * grid: wide enough for two or three card columns. full: edge to edge.
   */
  width?: ScreenWidth;
  style?: StyleProp<ViewStyle>;
}

const MAX: Record<ScreenWidth, number | undefined> = {
  content: MAX_CONTENT_WIDTH,
  grid: MAX_GRID_WIDTH,
  full: undefined,
};

export function Screen({ children, edges = ["top"], width = "content", style }: Props) {
  const theme = useTheme();
  const maxWidth = MAX[width];
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: theme.colors.background.primary }]}
    >
      <View style={[styles.fill, maxWidth ? [styles.centered, { maxWidth }] : null, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { alignSelf: "center", width: "100%" },
});
