import { StyleSheet, View } from "react-native";

import { AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export function LeadRowSkeleton() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        { gap: theme.spacing[3], paddingHorizontal: 14, paddingVertical: theme.spacing[3] },
      ]}
    >
      <AppSkeleton shape="circle" width={36} height={36} />
      <View style={[styles.fill, { gap: theme.spacing[2] }]}>
        <AppSkeleton width="55%" />
        <AppSkeleton width="80%" height={11} />
        <AppSkeleton width="30%" height={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row" },
  fill: { flex: 1 },
});
