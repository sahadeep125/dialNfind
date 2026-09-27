import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Two to four mutually exclusive choices in one track, e.g. the theme picker. */
export function AppSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: theme.colors.background.tertiary, borderRadius: theme.radius.md },
      ]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const color = selected ? theme.colors.text.primary : theme.colors.text.secondary;
        const Icon = o.icon;
        return (
          <AppPressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            haptic
            scale={false}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              { borderRadius: theme.radius.md - 3 },
              selected
                ? [{ backgroundColor: theme.colors.background.elevated }, theme.shadow.sm]
                : null,
            ]}
          >
            {Icon ? <Icon size={16} color={color} strokeWidth={2.2} /> : null}
            <AppText variant="labelSmall" style={{ color }} numberOfLines={1}>
              {o.label}
            </AppText>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", gap: 3, padding: 3 },
  segment: {
    alignItems: "center",
    borderCurve: "continuous",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
  },
});
