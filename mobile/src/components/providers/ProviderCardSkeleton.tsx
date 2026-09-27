import { StyleSheet, View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";

/** Placeholder with the same shape as ProviderCard, so nothing jumps when results arrive. */
export function ProviderCardSkeleton() {
  return (
    <AppCard>
      <View style={styles.row}>
        <AppSkeleton width={56} height={56} shape="block" />
        <View style={styles.lines}>
          <AppSkeleton width="70%" height={16} />
          <AppSkeleton width="45%" />
          <AppSkeleton width="55%" />
        </View>
      </View>
      <View style={[styles.row, styles.badges]}>
        <AppSkeleton width={78} height={22} shape="circle" />
        <AppSkeleton width={96} height={22} shape="circle" />
      </View>
      <View style={[styles.row, styles.buttons]}>
        <AppSkeleton width="48%" height={38} shape="block" />
        <AppSkeleton width="48%" height={38} shape="block" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  lines: { flex: 1, gap: 8, paddingTop: 2 },
  badges: { gap: 6, marginTop: 16 },
  buttons: { justifyContent: "space-between", marginTop: 28 },
});
