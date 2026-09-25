import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MapPin, Search } from "lucide-react-native";

import { AppInput, AppPressable, AppText } from "@/components/design-system";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocations } from "@/hooks/useLocations";
import { useTheme } from "@/hooks/useTheme";
import type { LocationOption } from "@/types";

interface Props {
  label?: string;
  placeholder: string;
  onPick: (location: LocationOption) => void;
}

/** Type-ahead over DialNFind's cities and localities. Suggestions show under the field. */
export function LocationSearchField({ label, placeholder, onPick }: Props) {
  const theme = useTheme();
  const [q, setQ] = useState("");
  const term = useDebounce(q.trim(), 250);
  const locations = useLocations(term);
  const suggestions = term.length >= 2 ? (locations.data ?? []).slice(0, 6) : [];

  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppInput
        label={label}
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={label ?? placeholder}
        leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
        trailingAction={
          locations.isFetching && term.length >= 2
            ? {
                icon: <ActivityIndicator size="small" color={theme.colors.brand.primary} />,
                onPress: () => undefined,
                accessibilityLabel: "Searching",
              }
            : undefined
        }
      />
      {suggestions.length > 0 ? (
        <View
          style={[
            styles.list,
            {
              borderRadius: theme.radius.md,
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.elevated,
            },
          ]}
        >
          {suggestions.map((l) => (
            <AppPressable
              key={`${l.kind}-${l.label}`}
              accessibilityRole="button"
              accessibilityLabel={`Use ${l.label}`}
              scale={false}
              onPress={() => {
                onPick(l);
                setQ("");
              }}
              style={[styles.item, { gap: theme.spacing[2], paddingHorizontal: theme.spacing[3] }]}
            >
              <MapPin size={16} color={theme.colors.text.tertiary} />
              <AppText numberOfLines={1} style={styles.flex}>
                {l.label}
              </AppText>
            </AppPressable>
          ))}
        </View>
      ) : term.length >= 2 && locations.isSuccess ? (
        <AppText variant="caption" tone="tertiary">
          No matching place. Type the details in the fields below instead.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, overflow: "hidden" },
  item: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  flex: { flex: 1 },
});
