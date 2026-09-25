import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export function AppDivider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: 1, marginLeft: inset, backgroundColor: theme.colors.border.primary },
        style,
      ]}
    />
  );
}
