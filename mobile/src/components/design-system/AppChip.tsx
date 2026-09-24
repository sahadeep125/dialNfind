import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leadingIcon?: ReactNode;
  size?: "sm" | "md";
}

/** Selectable pill used for filters, sort options and quick searches. */
export function AppChip({ label, selected = false, onPress, leadingIcon, size = "md" }: Props) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic
      style={[
        styles.base,
        {
          backgroundColor: selected ? theme.colors.brand.primary : theme.colors.background.elevated,
          borderColor: selected ? theme.colors.brand.primary : theme.colors.border.primary,
          height: size === "sm" ? 32 : 38,
          paddingHorizontal: size === "sm" ? theme.spacing[3] : theme.spacing[4],
        },
      ]}
    >
      {leadingIcon ? <View>{leadingIcon}</View> : null}
      <AppText
        variant="caption"
        style={{
          color: selected ? "#FFFFFF" : theme.colors.text.primary,
          fontFamily: theme.typography.label.fontFamily,
        }}
      >
        {label}
      </AppText>
    </AppPressable>
  );
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
});
