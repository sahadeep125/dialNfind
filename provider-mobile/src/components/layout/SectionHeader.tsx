import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** A group title with an optional "See all" style link. AppSection uses the same look. */
export function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <AppText variant="section" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="meta">{subtitle}</AppText> : null}
      </View>
      {actionLabel && onAction ? (
        <AppPressable accessibilityRole="link" hitSlop={12} onPress={onAction}>
          <AppText
            variant="caption"
            tone="brand"
            style={{ fontFamily: theme.typography.label.fontFamily }}
          >
            {actionLabel}
          </AppText>
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  titles: { flex: 1, gap: 1 },
});
