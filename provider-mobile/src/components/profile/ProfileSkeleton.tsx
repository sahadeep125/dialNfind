import { View } from "react-native";

import { AppCard, AppSkeleton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  cards?: number;
}

/** Placeholder cards shown while an editor screen loads. */
export function ProfileSkeleton({ cards = 3 }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.layout.sectionGap, padding: theme.layout.screenPadding }}>
      {Array.from({ length: cards }, (_, i) => (
        <AppCard key={i}>
          <View style={{ gap: theme.spacing[3] }}>
            <AppSkeleton width="45%" height={18} />
            <AppSkeleton height={44} shape="block" />
            <AppSkeleton height={44} shape="block" />
            <AppSkeleton width="70%" height={12} />
          </View>
        </AppCard>
      ))}
    </View>
  );
}
