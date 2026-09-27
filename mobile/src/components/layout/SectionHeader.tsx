import { StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  const theme = useTheme();
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
        <AppPressable
          accessibilityRole="link"
          hitSlop={10}
          onPress={onAction}
          style={styles.action}
        >
          <AppText variant="labelSmall" tone="brand">
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={theme.colors.brand.primary} strokeWidth={2.4} />
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  titles: { flex: 1, gap: 2 },
  action: { alignItems: "center", flexDirection: "row", gap: 2, paddingBottom: 3 },
});
