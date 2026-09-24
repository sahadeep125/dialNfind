import { ScrollView, StyleSheet } from "react-native";
import { BadgeCheck, Clock, Star } from "lucide-react-native";

import { AppChip } from "@/components/design-system";
import { SORT_OPTIONS } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";
import type { SearchFilters } from "@/types";

interface Props {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
}

/** One scrolling row of sort and filter chips, like the website's filter bar. */
export function FilterBar({ filters, onChange }: Props) {
  const theme = useTheme();
  const on = theme.colors.brand.softText;
  const off = theme.colors.text.secondary;
  return (
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
        label="4+ rating"
        selected={filters.minRating === 4}
        leadingIcon={<Star size={14} color={filters.minRating === 4 ? on : off} />}
        onPress={() => onChange({ ...filters, minRating: filters.minRating === 4 ? undefined : 4 })}
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
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
});
