import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  /** Draw the leading content bare, without the tinted tile (for avatars and photos). */
  leadingBare?: boolean;
  trailing?: ReactNode;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  /** Horizontal padding. 16 inside cards; pass SHEET_INSET for rows in an edge-to-edge sheet. */
  inset?: number;
}

/** Settings-style row with a 56pt minimum height. Group rows with AppListGroup. */
export function AppListItem({
  title,
  subtitle,
  leading,
  leadingBare = false,
  trailing,
  value,
  onPress,
  destructive = false,
  showChevron = !!onPress,
  inset = 16,
}: Props) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { paddingHorizontal: inset }]}>
      {leading ? (
        leadingBare ? (
          leading
        ) : (
          <View
            style={[
              styles.leading,
              {
                backgroundColor: destructive
                  ? theme.colors.semantic.dangerSoft
                  : theme.colors.brand.soft,
              },
            ]}
          >
            {leading}
          </View>
        )
      ) : null}
      <View style={styles.body}>
        <AppText variant="label" tone={destructive ? "danger" : "primary"} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {showChevron ? <ChevronRight size={18} color={theme.colors.text.tertiary} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(", ")}
      onPress={onPress}
      scale={false}
    >
      {content}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 14, minHeight: 58, paddingVertical: 10 },
  leading: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  body: { flex: 1, gap: 2 },
});
