import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";

interface Props<T extends string | number> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Two to four mutually exclusive choices shown side by side, such as a date range. */
export function AppSegmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: theme.colors.background.tertiary, borderRadius: theme.radius.md },
      ]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <AppPressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            scale={false}
            style={[
              styles.item,
              { borderRadius: theme.radius.sm },
              selected && [
                { backgroundColor: theme.colors.background.elevated },
                theme.shadow.card,
              ],
            ]}
          >
            <AppText variant="label" tone={selected ? "primary" : "secondary"} numberOfLines={1}>
              {o.label}
            </AppText>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", gap: 4, padding: 4 },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8,
  },
});
