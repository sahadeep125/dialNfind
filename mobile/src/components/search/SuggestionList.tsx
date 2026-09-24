import { StyleSheet, View } from "react-native";
import { Clock, LayoutGrid, Search, Store, TrendingUp } from "lucide-react-native";

import { AppChip, AppListItem, AppPressable, AppText } from "@/components/design-system";
import { SectionHeader } from "@/components/layout";
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

  if (query.trim().length >= 2) {
    return (
      <View>
        <AppListItem
          title={`Search for "${query.trim()}"`}
          leading={<Search size={18} color={theme.colors.brand.primary} />}
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
              leading={<Icon size={18} color={theme.colors.text.secondary} />}
              onPress={() => onPickSuggestion(s)}
              showChevron={false}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing[5] }}>
      {recent.length ? (
        <View style={{ gap: theme.spacing[2] }}>
          <View style={styles.headerRow}>
            <AppText variant="subheading">Recent searches</AppText>
            <AppPressable accessibilityRole="button" onPress={clearRecent} hitSlop={8}>
              <AppText variant="label" tone="brand">
                Clear
              </AppText>
            </AppPressable>
          </View>
          {recent.map((term) => (
            <AppListItem
              key={term}
              title={term}
              leading={<Clock size={18} color={theme.colors.text.tertiary} />}
              onPress={() => onPickTerm(term)}
              showChevron={false}
            />
          ))}
        </View>
      ) : null}
      {popular.data?.length ? (
        <View style={{ gap: theme.spacing[3] }}>
          <SectionHeader title="Popular near you" />
          <View style={styles.chips}>
            {popular.data.slice(0, 10).map((p) => (
              <AppChip
                key={p.term}
                label={p.term}
                leadingIcon={<TrendingUp size={14} color={theme.colors.text.secondary} />}
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
