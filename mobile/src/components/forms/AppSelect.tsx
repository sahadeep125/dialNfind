import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";

import { AppPressable, AppSheet, AppText, SHEET_INSET } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";

interface Props<T extends string | number> {
  label?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
}

/** A form field that opens a bottom sheet list of choices. Use for anything longer than four options. */
export function AppSelect<T extends string | number>({
  label,
  placeholder = "Choose",
  options,
  value,
  onChange,
  error,
  required,
  disabled,
}: Props<T>) {
  const theme = useTheme();
  const tokens = theme.components.input;
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="labelSmall" tone="secondary">
          {label}
          {required ? (
            <AppText variant="labelSmall" tone="danger">
              {" "}
              *
            </AppText>
          ) : null}
        </AppText>
      ) : null}
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? "not chosen"}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        scale={false}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            minHeight: tokens.height,
            borderRadius: tokens.radius,
            paddingHorizontal: tokens.paddingHorizontal,
            backgroundColor: tokens.background,
            opacity: disabled ? 0.6 : 1,
            borderColor: error ? tokens.errorBorder : tokens.border,
            borderWidth: error ? theme.borderWidth.focus : theme.borderWidth.default,
          },
        ]}
      >
        <AppText tone={selected ? "primary" : "tertiary"} numberOfLines={1} style={styles.flex}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown size={18} color={theme.colors.text.tertiary} />
      </AppPressable>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
      <AppSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? placeholder}
        inset={false}
      >
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.value)}
          style={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <AppPressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                scale={false}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  { paddingHorizontal: SHEET_INSET }, 
                ]}
              >
                <View style={styles.flex}>
                  <AppText variant="label" tone={isSelected ? "brand" : "primary"}>
                    {item.label}
                  </AppText>
                  {item.description ? (
                    <AppText variant="caption" tone="secondary">
                      {item.description}
                    </AppText>
                  ) : null}
                </View>
                {isSelected ? <Check size={18} color={theme.colors.brand.primary} /> : null}
              </AppPressable>
            );
          }}
        />
      </AppSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: { alignItems: "center", borderCurve: "continuous", flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  list: { maxHeight: 420 },
  option: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
  },
});
