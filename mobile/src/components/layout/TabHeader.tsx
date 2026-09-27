import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

/** Large left-aligned title at the top of a tab screen, with an optional action beside it. */
export function TabHeader({ title, subtitle, right }: Props) {
  const theme = useTheme();
  const { gutter } = useLayout();
  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: gutter,
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[2],
        },
      ]}
    >
      <View style={styles.titles}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", gap: 12 },
  titles: { flex: 1, gap: 2 },
});
