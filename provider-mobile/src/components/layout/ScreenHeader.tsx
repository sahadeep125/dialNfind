import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppIconButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  /**
   * inline: stack screens, a back button and a compact title (the default).
   * large: tab roots, a big title on the left and actions on the right, no back button.
   */
  variant?: "inline" | "large";
  /** Draws a hairline under the header, for screens whose content scrolls under it. */
  bordered?: boolean;
}

/** The one header every screen uses, so titles always sit in the same place and weight. */
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  right,
  variant = "inline",
  bordered = false,
}: Props) {
  const theme = useTheme();
  const border = bordered
    ? {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border.primary,
      }
    : null;

  if (variant === "large") {
    return (
      <View
        style={[
          styles.large,
          {
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[3],
            gap: theme.spacing[3],
          },
          border,
        ]}
      >
        <View style={styles.titles}>
          {title ? (
            <AppText variant="title" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="meta" tone="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right ? <View style={[styles.actions, { gap: theme.spacing[2] }]}>{right}</View> : null}
      </View>
    );
  }

  return (
    <View
      style={[styles.row, { paddingHorizontal: theme.spacing[2], gap: theme.spacing[1] }, border]}
    >
      {showBack ? (
        <AppIconButton
          accessibilityLabel="Go back"
          icon={<ChevronLeft size={24} color={theme.colors.text.primary} />}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
      ) : (
        <View style={{ width: theme.spacing[2] }} />
      )}
      <View style={styles.titles}>
        {title ? (
          <AppText variant="section" numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="meta" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? (
        <View style={[styles.actions, { gap: theme.spacing[1], paddingRight: theme.spacing[2] }]}>
          {right}
        </View>
      ) : (
        <View style={{ width: 38 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", minHeight: 52 },
  large: { alignItems: "center", flexDirection: "row" },
  titles: { flex: 1, gap: 1, minWidth: 0 },
  actions: { alignItems: "center", flexDirection: "row" },
});
