import { ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TrendingUp } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useTheme } from "@/hooks/useTheme";
import { track } from "@/services/analytics";

interface Props {
  /** Horizontal page padding, so the row scrolls edge to edge but starts in line with the content. */
  inset: number;
}

/** One-tap searches for what people nearby look for most, on the brand header under the search. */
export function PopularChips({ inset }: Props) {
  const theme = useTheme();
  const terms = usePopularSearches().data?.slice(0, 6);
  if (!terms?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset, gap: theme.spacing[2] }]}
    >
      {terms.map(({ term }) => (
        <AppPressable
          key={term}
          accessibilityRole="button"
          accessibilityLabel={`Search for ${term}`}
          onPress={() => {
            track("search_submitted", { query: term, suggestion_type: null, source: "popular" });
            router.push({ pathname: "/search", params: { q: term } });
          }}
          style={[styles.chip, { borderRadius: theme.radius.full }]}
        >
          <TrendingUp size={14} color={theme.colors.brand.accent} strokeWidth={2.4} />
          <AppText variant="labelSmall" tone="white" numberOfLines={1}>
            {term}
          </AppText>
        </AppPressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center" },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
  },
});
