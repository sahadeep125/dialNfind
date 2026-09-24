import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <AppPressable accessibilityRole="link" hitSlop={10} onPress={onAction}>
          <AppText variant="label" tone="brand">
            {actionLabel}
          </AppText>
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  titles: { flex: 1, gap: 2 },
});
