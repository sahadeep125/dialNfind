import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";

interface Props<T extends string | number> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  size?: "sm" | "md";
  /** "onHero" draws a translucent track for use inside the hero card. */
  appearance?: "default" | "onHero";
}

/** Two to four mutually exclusive choices shown side by side, such as a date range. */
export function AppSegmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = "md",
  appearance = "default",
}: Props<T>) {
  const theme = useTheme();
  const onHero = appearance === "onHero";
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          backgroundColor: onHero ? "rgba(255,255,255,0.14)" : theme.colors.background.subtle,
          borderRadius: theme.radius.md,
        },
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
              { borderRadius: theme.radius.sm + 1, minHeight: size === "sm" ? 26 : 32 },
              selected && [
                { backgroundColor: onHero ? "#FFFFFF" : theme.colors.background.elevated },
                theme.shadow.thumb,
              ],
            ]}
          >
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{
                fontFamily: theme.typography.label.fontFamily,
                color: onHero
                  ? selected
                    ? theme.colors.brand.primary
                    : "rgba(255,255,255,0.8)"
                  : selected
                    ? theme.colors.text.primary
                    : theme.colors.text.secondary,
              }}
            >
              {o.label}
            </AppText>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", gap: 2, padding: 3 },
  item: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 8 },
});
