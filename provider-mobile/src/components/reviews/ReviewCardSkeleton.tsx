import { StyleSheet, View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

export function ReviewCardSkeleton() {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <AppSkeleton shape="circle" width={40} height={40} />
        <View style={[styles.fill, { gap: theme.spacing[2] }]}>
          <AppSkeleton width="50%" />
          <AppSkeleton width="30%" height={12} />
        </View>
      </View>
      <View style={{ gap: theme.spacing[2], marginTop: theme.spacing[4] }}>
        <AppSkeleton />
        <AppSkeleton width="80%" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  fill: { flex: 1 },
});
