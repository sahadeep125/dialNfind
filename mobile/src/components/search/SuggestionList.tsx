import { StyleSheet, View } from "react-native";
import { ArrowUpLeft, Clock, LayoutGrid, Search, Store, TrendingUp } from "lucide-react-native";

import {
  AppChip,
  AppListGroup,
  AppListItem,
  AppPressable,
  AppText,
} from "@/components/design-system";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useTheme } from "@/hooks/useTheme";
import { useSearchHistoryStore } from "@/stores/useSearchHistoryStore";
import type { Suggestion } from "@/types";

interface Props {
  query: string;
  onPickTerm: (term: string) => void;
  onPickSuggestion: (suggestion: Suggestion) => void;
}

/** Shown while typing: live suggestions, or recent and popular searches when the field is empty. */
export function SuggestionList({ query, onPickTerm, onPickSuggestion }: Props) {
  const theme = useTheme();
  const recent = useSearchHistoryStore((s) => s.recent);
  const clearRecent = useSearchHistoryStore((s) => s.clear);
  const popular = usePopularSearches();
  const suggestions = useSuggestions(query);
  const icon = { service: Search, category: LayoutGrid, provider: Store } as const;
  const arrow = <ArrowUpLeft size={16} color={theme.colors.text.tertiary} />;

  if (query.trim().length >= 2) {
    return (
      <AppListGroup inset={66}>
        <AppListItem
          title={`Search for "${query.trim()}"`}
          leading={<Search size={18} color={theme.colors.brand.primary} strokeWidth={2.4} />}
          onPress={() => onPickTerm(query)}
          showChevron={false}
        />
        {(suggestions.data ?? []).map((s) => {
          const Icon = icon[s.type];
          return (
            <AppListItem
              key={`${s.type}-${s.slug}`}
              title={s.label}
              subtitle={
                s.context ??
                (s.type === "category"
                  ? "Category"
                  : s.type === "provider"
                    ? "Business"
                    : "Service")
              }
              leading={<Icon size={18} color={theme.colors.brand.primary} />}
              trailing={arrow}
              onPress={() => onPickSuggestion(s)}
              showChevron={false}
            />
          );
        })}
      </AppListGroup>
    );
  }

  return (
    <View style={{ gap: theme.spacing[6] }}>
      {recent.length ? (
        <View style={{ gap: theme.spacing[3] }}>
          <View style={styles.headerRow}>
            <AppText variant="subheading" accessibilityRole="header">
              Recent searches
            </AppText>
            <AppPressable accessibilityRole="button" onPress={clearRecent} hitSlop={8}>
              <AppText variant="labelSmall" tone="brand">
                Clear
              </AppText>
            </AppPressable>
          </View>
          <AppListGroup>
            {recent.map((term) => (
              <AppListItem
                key={term}
                title={term}
                leading={<Clock size={18} color={theme.colors.text.secondary} />}
                trailing={arrow}
                onPress={() => onPickTerm(term)}
                showChevron={false}
              />
            ))}
          </AppListGroup>
        </View>
      ) : null}
      {popular.data?.length ? (
        <View style={{ gap: theme.spacing[3] }}>
          <AppText variant="subheading" accessibilityRole="header">
            Popular near you
          </AppText>
          <View style={styles.chips}>
            {popular.data.slice(0, 10).map((p) => (
              <AppChip
                key={p.term}
                label={p.term}
                icon={TrendingUp}
                onPress={() => onPickTerm(p.term)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
