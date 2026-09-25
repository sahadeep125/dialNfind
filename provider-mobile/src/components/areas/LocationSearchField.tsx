import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MapPin, Search, X } from "lucide-react-native";

import { AppInput, AppPressable, AppText } from "@/components/design-system";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocations } from "@/hooks/useLocations";
import { useTheme } from "@/hooks/useTheme";
import type { LocationOption } from "@/types";

interface Props {
  label?: string;
  placeholder?: string;
  onPick: (location: LocationOption) => void;
}

/** Type-ahead over /locations. Results show inline under the field (up to six). */
export function LocationSearchField({
  label,
  placeholder = "Search a locality or city",
  onPick,
}: Props) {
  const theme = useTheme();
  const [q, setQ] = useState("");
  const term = useDebounce(q, 250);
  const active = term.trim().length >= 2;
  const locations = useLocations(active ? term : "");
  const results = active ? (locations.data ?? []).slice(0, 6) : [];

  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppInput
        label={label}
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
        trailingAction={
          q
            ? {
                icon: <X size={18} color={theme.colors.text.tertiary} />,
                onPress: () => setQ(""),
                accessibilityLabel: "Clear search",
              }
            : undefined
        }
      />
      {active && locations.isFetching && !results.length ? (
        <ActivityIndicator color={theme.colors.brand.primary} style={styles.spinner} />
      ) : null}
      {active && !locations.isFetching && !results.length ? (
        <AppText variant="caption" tone="tertiary">
          No places match. You can type the area name below instead.
        </AppText>
      ) : null}
      {results.length ? (
        <View
          style={[
            styles.results,
            {
              borderRadius: theme.radius.md,
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.elevated,
            },
          ]}
        >
          {results.map((l, i) => (
            <AppPressable
              key={`${l.kind}-${l.label}`}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${l.label}`}
              scale={false}
              onPress={() => {
                onPick(l);
                setQ("");
              }}
              style={[
                styles.row,
                {
                  gap: theme.spacing[3],
                  paddingHorizontal: theme.spacing[3],
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border.primary,
                },
              ]}
            >
              <MapPin size={16} color={theme.colors.text.tertiary} />
              <AppText numberOfLines={1} style={styles.flex}>
                {l.label}
              </AppText>
            </AppPressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { alignSelf: "flex-start" },
  results: { borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  flex: { flex: 1 },
});
