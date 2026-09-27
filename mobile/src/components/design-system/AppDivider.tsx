import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export function AppDivider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth * 2,
          marginLeft: inset,
          backgroundColor: theme.colors.border.primary,
        },
        style,
      ]}
    />
  );
}
