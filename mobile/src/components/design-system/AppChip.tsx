import { StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Icon before the label, colored to match the selected state. */
  icon?: LucideIcon;
  size?: "sm" | "md";
  /** Icon after the label, e.g. a chevron on chips that open a picker. */
  trailingIcon?: LucideIcon;
}

/** Selectable pill used for filters, sort options, quick searches and read-only tags. */
export function AppChip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  trailingIcon: Trailing,
  size = "md",
}: Props) {
  const theme = useTheme();
  const tokens = theme.components.chip;
  const fg = selected ? tokens.selectedText : theme.colors.text.primary;
  const iconColor = selected ? tokens.selectedText : theme.colors.text.secondary;
  return (
    <AppPressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={onPress ? { selected } : undefined}
      disabled={!onPress}
      onPress={onPress}
      haptic
      style={[
        styles.base,
        {
          backgroundColor: selected ? tokens.selectedBackground : tokens.background,
          borderColor: selected ? tokens.selectedBorder : tokens.border,
          height: tokens.height[size],
          paddingHorizontal: size === "sm" ? theme.spacing[3] : theme.spacing[4],
        },
      ]}
    >
      {Icon ? <Icon size={size === "sm" ? 14 : 16} color={iconColor} strokeWidth={2.2} /> : null}
      <AppText variant="labelSmall" numberOfLines={1} style={{ color: fg }}>
        {label}
      </AppText>
      {Trailing ? <Trailing size={14} color={iconColor} strokeWidth={2.2} /> : null}
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
