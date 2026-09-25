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
  trailing?: ReactNode;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

/** Settings-style row with a 52pt minimum height. */
export function AppListItem({
  title,
  subtitle,
  leading,
  trailing,
  value,
  onPress,
  destructive = false,
  showChevron = !!onPress,
}: Props) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { paddingHorizontal: theme.spacing[4] }]}>
      {leading ? (
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
      ) : null}
      <View style={styles.body}>
        <AppText variant="label" tone={destructive ? "danger" : "primary"} numberOfLines={1}>
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
      accessibilityLabel={title}
      onPress={onPress}
      scale={false}
    >
      {content}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 56, paddingVertical: 10 },
  leading: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  body: { flex: 1, gap: 2 },
});
