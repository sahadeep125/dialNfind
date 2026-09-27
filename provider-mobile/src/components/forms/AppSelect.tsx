import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Check, ChevronDown, Search } from "lucide-react-native";

import { AppField, AppInput, AppPressable, AppSheet, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";

interface Props<T extends string | number> {
  label?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  /** Adds a filter box to the sheet. On by default for more than 10 options. */
  searchable?: boolean;
}

/** A dropdown field that opens a bottom sheet list of choices. Use for anything longer than four options. */
export function AppSelect<T extends string | number>({
  label,
  placeholder = "Choose",
  options,
  value,
  onChange,
  error,
  helper,
  required,
  disabled,
  searchable,
}: Props<T>) {
  const theme = useTheme();
  const tokens = theme.components.input;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const canSearch = searchable ?? options.length > 10;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = (): void => {
    setOpen(false);
    setQuery("");
  };

  return (
    <AppField label={label} helper={helper} error={error} required={required}>
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
            gap: theme.spacing[2],
            minHeight: tokens.height,
            borderRadius: tokens.radius,
            paddingHorizontal: tokens.paddingHorizontal,
            backgroundColor: disabled ? theme.colors.background.tertiary : tokens.background,
            borderColor: error ? tokens.errorBorder : tokens.border,
            borderWidth: error ? theme.borderWidth.focus : theme.borderWidth.default,
          },
        ]}
      >
        <AppText tone={selected ? "primary" : "tertiary"} numberOfLines={1} style={styles.flex}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown size={16} color={theme.colors.text.tertiary} />
      </AppPressable>
      <AppSheet visible={open} onClose={close} title={label ?? placeholder}>
        {canSearch ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[2] }}>
            <AppInput
              size="sm"
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              autoCorrect={false}
              accessibilityLabel={`Search ${label ?? "options"}`}
              leadingIcon={<Search size={16} color={theme.colors.text.tertiary} />}
            />
          </View>
        ) : null}
        <FlatList
          data={visible}
          keyExtractor={(o) => String(o.value)}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <AppText variant="meta" align="center" style={{ padding: theme.spacing[6] }}>
              Nothing matches “{query}”
            </AppText>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <AppPressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                scale={false}
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                style={[
                  styles.option,
                  {
                    paddingHorizontal: theme.spacing[4],
                    backgroundColor: isSelected ? theme.colors.brand.soft : "transparent",
                  },
                ]}
              >
                <View style={styles.flex}>
                  <AppText variant="label" tone={isSelected ? "brand" : "primary"}>
                    {item.label}
                  </AppText>
                  {item.description ? <AppText variant="meta">{item.description}</AppText> : null}
                </View>
                {isSelected ? <Check size={16} color={theme.colors.brand.primary} /> : null}
              </AppPressable>
            );
          }}
        />
      </AppSheet>
    </AppField>
  );
}

const styles = StyleSheet.create({
  field: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  list: { maxHeight: 440 },
  option: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 46,
    paddingVertical: 8,
  },
});
