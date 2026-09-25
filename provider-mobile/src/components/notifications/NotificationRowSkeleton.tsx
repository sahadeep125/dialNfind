import { StyleSheet, View } from "react-native";

import { AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export function NotificationRowSkeleton() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
        },
      ]}
    >
      <AppSkeleton shape="block" width={40} height={40} />
      <View style={[styles.fill, { gap: theme.spacing[2] }]}>
        <AppSkeleton width="60%" />
        <AppSkeleton width="90%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  fill: { flex: 1 },
});
