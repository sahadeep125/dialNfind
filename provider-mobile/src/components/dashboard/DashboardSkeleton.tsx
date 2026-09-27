import { View } from "react-native";

import { AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

/** Mirrors the dashboard: hero, KPI grid, chart and a list. */
export function DashboardSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.layout.sectionGap }}>
      <AppSkeleton shape="block" height={184} />
      <AppSkeleton shape="block" height={156} />
      <AppSkeleton shape="block" height={220} />
      <AppSkeleton shape="block" height={180} />
    </View>
  );
}
