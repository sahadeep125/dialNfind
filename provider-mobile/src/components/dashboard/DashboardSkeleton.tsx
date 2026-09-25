import { View } from "react-native";

import { AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { StatGrid } from "./StatGrid";

interface Props {
  columns: number;
}

export function DashboardSkeleton({ columns }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[4] }}>
      <StatGrid columns={columns}>
        {[0, 1, 2, 3].map((i) => (
          <AppSkeleton key={i} shape="block" height={112} />
        ))}
      </StatGrid>
      <AppSkeleton shape="block" height={280} />
      <AppSkeleton shape="block" height={180} />
    </View>
  );
}
