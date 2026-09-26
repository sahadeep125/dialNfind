import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View, type TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Search, X } from "lucide-react-native";

import { AppIconButton, AppInput } from "@/components/design-system";
import { Screen } from "@/components/layout";
import { FilterBar, ProviderResults, SuggestionList } from "@/components/search";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useSearchHistoryStore } from "@/stores/useSearchHistoryStore";
import type { SearchFilters, SortOption, Suggestion } from "@/types";

const SORTS: SortOption[] = ["relevance", "distance", "rating", "reviews"];

export default function SearchScreen() {
  const theme = useTheme();
  const { columns } = useLayout();
  const params = useLocalSearchParams<{ q?: string; sort?: string; category?: string; sub?: string }>();
  const addSearch = useSearchHistoryStore((s) => s.addSearch);
  const inputRef = useRef<TextInput>(null);
  const initialSort = SORTS.find((s) => s === params.sort) ?? "relevance";
  const [text, setText] = useState(params.q ?? "");
  const [editing, setEditing] = useState(!params.q && !params.sort && !params.category && !params.sub);
  const [filters, setFilters] = useState<SearchFilters>({
    q: params.q,
    category: params.category,
    subcategory: params.sub,
    sort: initialSort,
    openNow: false,
    verified: false,
  });

  const runSearch = (term: string): void => {
    const clean = term.trim();
    setText(clean);
    addSearch(clean);
    setFilters((f) => ({
      ...f,
      q: clean || undefined,
      category: undefined,
      subcategory: undefined,
    }));
    setEditing(false);
    inputRef.current?.blur();
  };

  const pickSuggestion = (s: Suggestion): void => {
    if (s.type === "provider") return router.push(`/provider/${s.slug}`);
    if (s.type === "category") return router.push(`/category/${s.slug}`);
    addSearch(s.label);
    setText(s.label);
    setFilters((f) => ({ ...f, q: undefined, category: s.categorySlug, subcategory: s.slug }));
    setEditing(false);
    inputRef.current?.blur();
  };

  return (
    <Screen constrained={columns === 1}>
      <View
        style={[
          styles.bar,
          {
            paddingHorizontal: theme.spacing[3],
            paddingTop: theme.spacing[2],
            gap: theme.spacing[2],
          },
        ]}
      >
        <AppIconButton
          accessibilityLabel="Go back"
          icon={<ArrowLeft size={22} color={theme.colors.text.primary} />}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        <View style={styles.flex}>
          <AppInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onFocus={() => setEditing(true)}
            placeholder="Service, category or business"
            autoFocus={editing}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(text)}
            accessibilityLabel="Search"
            leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
            trailingAction={
              text
                ? {
                    icon: <X size={18} color={theme.colors.text.tertiary} />,
                    onPress: () => (setText(""), inputRef.current?.focus()),
                    accessibilityLabel: "Clear search",
                  }
                : undefined
            }
          />
        </View>
      </View>

      {editing ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing[4] }}
        >
          <SuggestionList query={text} onPickTerm={runSearch} onPickSuggestion={pickSuggestion} />
        </ScrollView>
      ) : (
        <ProviderResults
          filters={filters}
          header={<FilterBar filters={filters} onChange={setFilters} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
});
