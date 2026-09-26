import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BadgeCheck, Check, Clock, MapPin, Star } from "lucide-react-native";

import { AppChip, AppListItem, AppSheet } from "@/components/design-system";
import { SORT_OPTIONS } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";
import type { SearchFilters } from "@/types";
import { DISTANCE_OPTIONS, RATING_OPTIONS, distanceChipLabel, ratingChipLabel } from "@/utils/filters";

interface Props {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
}

/** One scrolling row of sort and filter chips, like the website's filter bar. */
export function FilterBar({ filters, onChange }: Props) {
  const theme = useTheme();
  const [sheet, setSheet] = useState<"rating" | "distance" | null>(null);
  const on = theme.colors.brand.softText;
  const off = theme.colors.text.secondary;
  const options = sheet === "rating" ? RATING_OPTIONS : DISTANCE_OPTIONS;
  const current = sheet === "rating" ? filters.minRating : filters.radiusKm;

  const pick = (value: number | undefined): void => {
    onChange(sheet === "rating" ? { ...filters, minRating: value } : { ...filters, radiusKm: value });
    setSheet(null);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <AppChip
          size="sm"
          label="Open now"
          selected={filters.openNow}
          leadingIcon={<Clock size={14} color={filters.openNow ? on : off} />}
          onPress={() => onChange({ ...filters, openNow: !filters.openNow })}
        />
        <AppChip
          size="sm"
          label="Verified"
          selected={filters.verified}
          leadingIcon={<BadgeCheck size={14} color={filters.verified ? on : off} />}
          onPress={() => onChange({ ...filters, verified: !filters.verified })}
        />
        <AppChip
          size="sm"
          label={ratingChipLabel(filters.minRating)}
          selected={!!filters.minRating}
          leadingIcon={<Star size={14} color={filters.minRating ? on : off} />}
          onPress={() => setSheet("rating")}
        />
        <AppChip
          size="sm"
          label={distanceChipLabel(filters.radiusKm)}
          selected={!!filters.radiusKm}
          leadingIcon={<MapPin size={14} color={filters.radiusKm ? on : off} />}
          onPress={() => setSheet("distance")}
        />
        {SORT_OPTIONS.map((o) => (
          <AppChip
            key={o.value}
            size="sm"
            label={o.label}
            selected={filters.sort === o.value}
            onPress={() => onChange({ ...filters, sort: o.value })}
          />
        ))}
      </ScrollView>
      <AppSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "rating" ? "Minimum rating" : "How far away"}
      >
        <View style={{ paddingBottom: theme.spacing[4] }}>
          {options.map((o) => (
            <AppListItem
              key={o.label}
              title={o.label}
              showChevron={false}
              trailing={o.value === current ? <Check size={18} color={theme.colors.brand.primary} /> : undefined}
              onPress={() => pick(o.value)}
            />
          ))}
        </View>
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
});
