import { StyleSheet, View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export function ReviewCardSkeleton() {
  const theme = useTheme();
  return (
    <AppCard padding={14}>
      <View style={[styles.row, { gap: theme.spacing[2.5] }]}>
        <AppSkeleton shape="circle" width={34} height={34} />
        <View style={[styles.fill, { gap: theme.spacing[1.5] }]}>
          <AppSkeleton width="45%" />
          <AppSkeleton width="30%" height={11} />
        </View>
      </View>
      <View style={{ gap: theme.spacing[1.5], marginTop: theme.spacing[3] }}>
        <AppSkeleton height={12} />
        <AppSkeleton width="75%" height={12} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  fill: { flex: 1 },
});
