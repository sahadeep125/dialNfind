import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ArrowUpDown,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Star,
} from "lucide-react-native";

import { AppChip, AppListItem, AppSheet, SHEET_INSET } from "@/components/design-system";
import { SORT_OPTIONS } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";
import type { SearchFilters } from "@/types";
import {
  DISTANCE_OPTIONS,
  RATING_OPTIONS,
  distanceChipLabel,
  ratingChipLabel,
} from "@/utils/filters";

interface Props {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  /** Horizontal padding so the row scrolls edge to edge but starts in line with the page. */
  inset?: number;
}

type SheetKind = "rating" | "distance" | "sort";

const TITLES: Record<SheetKind, string> = {
  rating: "Minimum rating",
  distance: "How far away",
  sort: "Sort results by",
};

/** One scrolling row of filter chips, with sort, rating and distance in bottom-sheet pickers. */
export function FilterBar({ filters, onChange, inset = 0 }: Props) {
  const theme = useTheme();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Best match";

  const options: { label: string; selected: boolean; pick: () => void }[] =
    sheet === "sort"
      ? SORT_OPTIONS.map((o) => ({
          label: o.label,
          selected: filters.sort === o.value,
          pick: () => onChange({ ...filters, sort: o.value }),
        }))
      : (sheet === "rating" ? RATING_OPTIONS : DISTANCE_OPTIONS).map((o) => ({
          label: o.label,
          selected: o.value === (sheet === "rating" ? filters.minRating : filters.radiusKm),
          pick: () =>
            onChange(
              sheet === "rating"
                ? { ...filters, minRating: o.value }
                : { ...filters, radiusKm: o.value },
            ),
        }));

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
        style={inset ? { marginHorizontal: -inset } : null}
        keyboardShouldPersistTaps="handled"
      >
        <AppChip
          size="sm"
          label={sortLabel}
          icon={ArrowUpDown}
          trailingIcon={ChevronDown}
          selected={filters.sort !== "relevance"}
          onPress={() => setSheet("sort")}
        />
        <View style={[styles.sep, { backgroundColor: theme.colors.border.secondary }]} />
        <AppChip
          size="sm"
          label="Open now"
          icon={Clock}
          selected={filters.openNow}
          onPress={() => onChange({ ...filters, openNow: !filters.openNow })}
        />
        <AppChip
          size="sm"
          label="Verified"
          icon={BadgeCheck}
          selected={filters.verified}
          onPress={() => onChange({ ...filters, verified: !filters.verified })}
        />
        <AppChip
          size="sm"
          label={ratingChipLabel(filters.minRating)}
          icon={Star}
          trailingIcon={ChevronDown}
          selected={!!filters.minRating}
          onPress={() => setSheet("rating")}
        />
        <AppChip
          size="sm"
          label={distanceChipLabel(filters.radiusKm)}
          icon={MapPin}
          trailingIcon={ChevronDown}
          selected={!!filters.radiusKm}
          onPress={() => setSheet("distance")}
        />
      </ScrollView>
      <AppSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet ? TITLES[sheet] : ""}
        inset={false}
      >
        <View style={{ paddingBottom: theme.spacing[2] }}>
          {options.map((o) => (
            <AppListItem
              key={o.label}
              title={o.label}
              inset={SHEET_INSET}
              showChevron={false}
              trailing={
                o.selected ? (
                  <Check size={20} color={theme.colors.brand.primary} strokeWidth={2.4} />
                ) : undefined
              }
              onPress={() => {
                o.pick();
                setSheet(null);
              }}
            />
          ))}
        </View>
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 8, paddingVertical: 2 },
  sep: { height: 20, marginHorizontal: 2, width: 1 },
});
