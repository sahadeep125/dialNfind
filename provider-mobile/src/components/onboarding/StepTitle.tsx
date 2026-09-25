import { View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle: string;
}

export function StepTitle({ title, subtitle }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[1] }}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {subtitle}
      </AppText>
    </View>
  );
}
