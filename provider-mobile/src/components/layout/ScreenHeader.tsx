import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { AppIconButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
}

/** Compact header with an optional back button, used by stack screens. */
export function ScreenHeader({ title, subtitle, showBack = true, right }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: theme.spacing[2] }]}>
      {showBack ? (
        <AppIconButton
          accessibilityLabel="Go back"
          icon={<ArrowLeft size={22} color={theme.colors.text.primary} />}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
      ) : (
        <View style={{ width: theme.spacing[2] }} />
      )}
      <View style={styles.titles}>
        {title ? (
          <AppText variant="subheading" numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 56 },
  titles: { flex: 1 },
});
