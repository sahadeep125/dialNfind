import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

/** A hairline between rows. Inset it to line up with row text, past the leading icon. */
export function AppDivider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          marginLeft: inset,
          backgroundColor: theme.colors.border.primary,
        },
        style,
      ]}
    />
  );
}
