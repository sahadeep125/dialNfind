import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leadingIcon?: ReactNode;
  /** Shown after the label in a lighter weight, e.g. "Calls 12". */
  count?: number;
  size?: "sm" | "md";
}

/** Selectable pill used for filters, sort options and quick searches. */
export function AppChip({
  label,
  selected = false,
  onPress,
  leadingIcon,
  count,
  size = "sm",
}: Props) {
  const theme = useTheme();
  const fg = selected ? theme.colors.background.secondary : theme.colors.text.primary;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      haptic
      style={[
        styles.base,
        {
          backgroundColor: selected ? theme.colors.text.primary : theme.colors.background.elevated,
          borderColor: selected ? theme.colors.text.primary : theme.colors.border.primary,
          height: size === "sm" ? 32 : 36,
          paddingHorizontal: size === "sm" ? theme.spacing[3] : 14,
        },
      ]}
    >
      {leadingIcon ? <View>{leadingIcon}</View> : null}
      <AppText
        variant="caption"
        style={{ color: fg, fontFamily: theme.typography.label.fontFamily }}
      >
        {label}
      </AppText>
      {count !== undefined ? (
        <AppText variant="caption" numeric style={{ color: fg, opacity: 0.6 }}>
          {count.toLocaleString("en-IN")}
        </AppText>
      ) : null}
    </AppPressable>
  );
}

/** A single horizontally scrolling line of chips that bleeds to the screen edge. */
export function AppChipRow({ children, bleed = 16 }: { children: ReactNode; bleed?: number }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -bleed }}
      contentContainerStyle={{ gap: theme.spacing[2], paddingHorizontal: bleed }}
    >
      {children}
    </ScrollView>
  );
}

/** A thin vertical rule to separate chip groups inside an AppChipRow. */
export function AppChipDivider() {
  const theme = useTheme();
  return <View style={[styles.rule, { backgroundColor: theme.colors.border.primary }]} />;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    overflow: "hidden",
  },
  rule: { alignSelf: "center", height: 20, width: 1 },
});
