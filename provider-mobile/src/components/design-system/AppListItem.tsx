import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  title: string;
  subtitle?: string;
  /** Usually a 16–18pt lucide icon; it sits in a neutral tile. Pass any node for avatars. */
  leading?: ReactNode;
  /** Render `leading` as-is, without the icon tile (avatars, logos, channel icons). */
  bareLeading?: boolean;
  trailing?: ReactNode;
  value?: string;
  /** A pill or count shown after the title. */
  badge?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Tint the icon tile with the brand color, for a row that needs attention. */
  accent?: boolean;
  showChevron?: boolean;
  accessibilityLabel?: string;
}

/** Settings-style row: 48pt minimum, icon tile, title and one line of meta. */
export function AppListItem({
  title,
  subtitle,
  leading,
  bareLeading = false,
  trailing,
  value,
  badge,
  onPress,
  destructive = false,
  accent = false,
  showChevron = !!onPress,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const { layout } = theme;
  const tileBg = destructive
    ? theme.colors.semantic.dangerSoft
    : accent
      ? theme.colors.brand.soft
      : theme.colors.background.subtle;
  const content = (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          minHeight: layout.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: layout.rowPaddingVertical,
        },
      ]}
    >
      {leading ? (
        bareLeading ? (
          leading
        ) : (
          <View
            style={[
              styles.leading,
              {
                backgroundColor: tileBg,
                borderRadius: theme.radius.sm + 2,
                height: layout.iconTile,
                width: layout.iconTile,
              },
            ]}
          >
            {leading}
          </View>
        )
      ) : null}
      <View style={styles.body}>
        <View style={[styles.titleRow, { gap: theme.spacing[1.5] }]}>
          <AppText
            variant="label"
            tone={destructive ? "danger" : "primary"}
            numberOfLines={1}
            style={styles.shrink}
          >
            {title}
          </AppText>
          {badge}
        </View>
        {subtitle ? (
          <AppText variant="meta" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="meta" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {showChevron ? <ChevronRight size={16} color={theme.colors.text.tertiary} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      onPress={onPress}
      scale={false}
    >
      {content}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  leading: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 1, minWidth: 0 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  value: { maxWidth: "40%" },
});
