import { StyleSheet, View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";

export function ProviderCardSkeleton() {
  return (
    <AppCard>
      <View style={styles.row}>
        <AppSkeleton width={52} height={52} shape="block" />
        <View style={styles.lines}>
          <AppSkeleton width="70%" height={16} />
          <AppSkeleton width="45%" />
          <AppSkeleton width="55%" />
        </View>
      </View>
      <View style={[styles.row, styles.buttons]}>
        <AppSkeleton width="48%" height={36} shape="block" />
        <AppSkeleton width="48%" height={36} shape="block" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  lines: { flex: 1, gap: 8 },
  buttons: { justifyContent: "space-between", marginTop: 16 },
});
