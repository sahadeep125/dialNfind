import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppIconButton, AppText } from "@/components/design-system";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
}

/** Compact header for stack screens: back button, a centered title, and an optional action on the right. */
export function ScreenHeader({ title, subtitle, showBack = true, right }: Props) {
  const theme = useTheme();
  const { gutter } = useLayout();
  const side = <View style={styles.side} />;
  return (
    <View style={[styles.row, { paddingHorizontal: gutter - 4 }]}>
      <View style={styles.side}>
        {showBack ? (
          <AppIconButton
            accessibilityLabel="Go back"
            variant="surface"
            size="sm"
            icon={<ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.2} />}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
        ) : null}
      </View>
      <View style={styles.titles}>
        {title ? (
          <AppText variant="subheading" align="center" numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" tone="secondary" align="center" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={[styles.side, styles.right]}>{right}</View> : side}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 56 },
  titles: { flex: 1 },
  // Both sides share a minimum width so the title stays centered whatever sits beside it.
  side: { alignItems: "flex-start", justifyContent: "center", minWidth: 88 },
  right: { alignItems: "flex-end" },
});
