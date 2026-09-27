import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";

import { AppCard, AppChip, AppIconButton, AppText } from "@/components/design-system";
import { CategoryIcon } from "@/components/categories";
import { Screen, ScreenHeader } from "@/components/layout";
import { FilterBar, ProviderResults } from "@/components/search";
import { useCategories } from "@/hooks/useCategories";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { track } from "@/services/analytics";
import type { SearchFilters } from "@/types";
import { plural } from "@/utils/format";

export default function CategoryScreen() {
  const theme = useTheme();
  const { columns, gutter } = useLayout();
  const { slug, sub } = useLocalSearchParams<{ slug: string; sub?: string }>();
  const { data: categories } = useCategories();
  const category = useMemo(() => categories?.find((c) => c.slug === slug), [categories, slug]);
  useEffect(() => {
    track("category_viewed", { category: slug, subcategory: sub || null });
  }, [slug, sub]);
  const [filters, setFilters] = useState<SearchFilters>({
    category: slug,
    subcategory: sub || undefined,
    sort: "relevance",
    openNow: false,
    verified: false,
  });

  const header = (
    <View style={{ gap: theme.spacing[4] }}>
      {category ? (
        <AppCard variant="tinted" padding={theme.spacing[4]}>
          <View style={styles.intro}>
            <CategoryIcon slug={category.slug} size={56} />
            <View style={styles.flex}>
              <AppText variant="heading">{category.name}</AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={2}>
                {category.description || `${plural(category.providerCount, "provider")} near you`}
              </AppText>
            </View>
          </View>
        </AppCard>
      ) : null}
      {category?.subcategories.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={[styles.chips, { paddingHorizontal: gutter }]}
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
      <FilterBar filters={filters} onChange={setFilters} inset={gutter} />
    </View>
  );

  return (
    <Screen width={columns > 1 ? "grid" : "content"}>
      <ScreenHeader
        title={category?.name ?? "Category"}
        right={
          <AppIconButton
            accessibilityLabel="Search"
            variant="surface"
            size="sm"
            icon={<Search size={18} color={theme.colors.text.primary} strokeWidth={2.2} />}
            onPress={() => router.push("/search")}
          />
        }
      />
      <ProviderResults filters={filters} header={header} source="category_browse" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: "center", flexDirection: "row", gap: 14 },
  flex: { flex: 1, gap: 2 },
  chips: { gap: 8 },
});
