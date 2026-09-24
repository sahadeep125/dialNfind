import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";

import { AppChip, AppIconButton, AppText } from "@/components/design-system";
import { CategoryIcon } from "@/components/categories";
import { Screen, ScreenHeader } from "@/components/layout";
import { FilterBar, ProviderResults } from "@/components/search";
import { useCategories } from "@/hooks/useCategories";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import type { SearchFilters } from "@/types";

export default function CategoryScreen() {
  const theme = useTheme();
  const { columns } = useLayout();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: categories } = useCategories();
  const category = useMemo(() => categories?.find((c) => c.slug === slug), [categories, slug]);
  const [filters, setFilters] = useState<SearchFilters>({
    category: slug,
    sort: "relevance",
    openNow: false,
    verified: false,
  });

  const header = (
    <View style={{ gap: theme.spacing[3] }}>
      {category ? (
        <View style={styles.intro}>
          <CategoryIcon slug={category.slug} size={52} />
          <View style={styles.flex}>
            <AppText variant="heading">{category.name}</AppText>
            {category.description ? (
              <AppText variant="caption" tone="secondary" numberOfLines={2}>
                {category.description}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
      {category?.subcategories.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <AppChip
            label="All"
            selected={!filters.subcategory}
            onPress={() => setFilters((f) => ({ ...f, subcategory: undefined }))}
          />
          {category.subcategories.map((s) => (
            <AppChip
              key={s.id}
              label={s.name}
              selected={filters.subcategory === s.slug}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  subcategory: f.subcategory === s.slug ? undefined : s.slug,
                }))
              }
            />
          ))}
        </ScrollView>
      ) : null}
      <FilterBar filters={filters} onChange={setFilters} />
    </View>
  );

  return (
    <Screen constrained={columns === 1}>
      <ScreenHeader
        title={category?.name ?? "Category"}
        right={
          <AppIconButton
            accessibilityLabel="Search"
            icon={<Search size={20} color={theme.colors.text.primary} />}
            onPress={() => router.push("/search")}
          />
        }
      />
      <ProviderResults filters={filters} header={header} source="category_browse" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: "center", flexDirection: "row", gap: 12 },
  flex: { flex: 1, gap: 2 },
  chips: { gap: 8 },
});
