import { StyleSheet, View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export function LeadRowSkeleton() {
  const theme = useTheme();
  return (
    <AppCard padding={theme.spacing[4]}>
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <AppSkeleton shape="circle" width={36} height={36} />
        <View style={[styles.fill, { gap: theme.spacing[2] }]}>
          <AppSkeleton width="55%" />
          <AppSkeleton width="35%" height={12} />
        </View>
      </View>
      <View style={{ gap: theme.spacing[2], marginTop: theme.spacing[4] }}>
        <AppSkeleton width="70%" />
        <AppSkeleton width="45%" height={12} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  fill: { flex: 1 },
});
