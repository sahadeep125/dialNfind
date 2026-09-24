import type { ReactNode } from "react";
import { View } from "react-native";

import { AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** A titled card on the provider profile. */
export function DetailSection({ title, children, action }: Props) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[3] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing[2],
          }}
        >
          <AppText variant="subheading" accessibilityRole="header">
            {title}
          </AppText>
          {action}
        </View>
        {children}
      </View>
    </AppCard>
  );
}
