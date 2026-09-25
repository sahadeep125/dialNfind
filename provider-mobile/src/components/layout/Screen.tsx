import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  children: ReactNode;
  edges?: Edge[];
  /** Constrain content to a readable width and center it on tablets. */
  constrained?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, edges = ["top"], constrained = true, style }: Props) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: theme.colors.background.primary }]}
    >
      <View style={[styles.fill, constrained ? styles.constrained : null, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  constrained: { alignSelf: "center", maxWidth: MAX_CONTENT_WIDTH, width: "100%" },
});
