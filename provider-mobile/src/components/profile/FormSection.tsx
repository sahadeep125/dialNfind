import type { ReactNode } from "react";
import { View } from "react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled card that groups related form fields. */
export function FormSection({ title, description, children }: Props) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[1], marginBottom: theme.spacing[4] }}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing[4] }}>{children}</View>
    </AppCard>
  );
}
