import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppCard, AppIconTile, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}

/** A titled card on the provider profile. */
export function DetailSection({ title, icon, children, action }: Props) {
  const theme = useTheme();
  return (
    <AppCard padding={theme.spacing[5]}>
      <View style={{ gap: theme.spacing[4] }}>
        <View style={[styles.head, { gap: theme.spacing[3] }]}>
          {icon ? <AppIconTile icon={icon} size={32} /> : null}
          <AppText variant="subheading" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {action}
        </View>
        {children}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1 },
});
