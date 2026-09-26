import { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { router } from "expo-router";
import { Search, SearchX } from "lucide-react-native";

import { AppCard, AppChip, AppInput, AppSkeleton, AppText } from "@/components/design-system";
import { CategoryIcon } from "@/components/categories";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { useCategories } from "@/hooks/useCategories";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";
import { plural } from "@/utils/format";

/** Every category with its services, searchable. Tapping a service opens the category already filtered to it. */
export default function CategoriesScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, error, refetch } = useCategories();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data ?? [];
    return data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subcategories.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [data, query]);

  const renderItem = useCallback(
    ({ item: c }: ListRenderItemInfo<Category>) => (
      <AppCard
        padding={theme.spacing[4]}
        onPress={() => router.push(`/category/${c.slug}`)}
        accessibilityLabel={`${c.name}, ${plural(c.providerCount, "provider")}`}
      >
        <View style={[styles.head, { gap: theme.spacing[3] }]}>
          <CategoryIcon slug={c.slug} size={44} />
          <View style={styles.flex}>
            <AppText variant="subheading">{c.name}</AppText>
            <AppText variant="caption" tone="secondary">
              {plural(c.providerCount, "provider")}
            </AppText>
          </View>
        </View>
        {c.subcategories.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chips, { marginTop: theme.spacing[3] }]}
          >
            {c.subcategories.map((s) => (
              <AppChip
                key={s.id}
                size="sm"
                label={s.name}
                onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug, sub: s.slug } })}
              />
            ))}
          </ScrollView>
        ) : null}
      </AppCard>
    ),
    [theme],
  );

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="All services" />
      <FlatList
        data={isLoading || isError ? [] : filtered}
        keyExtractor={(c) => String(c.id)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { padding: theme.spacing[4], gap: theme.spacing[3] }]}
        ListHeaderComponent={
          <AppInput
            placeholder="Find a service"
            accessibilityLabel="Find a service"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[3] }}>
              <AppSkeleton shape="block" height={110} />
              <AppSkeleton shape="block" height={110} />
              <AppSkeleton shape="block" height={110} />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState icon={SearchX} title="No matching services" text="Try another word, or search for the provider by name." />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  head: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  chips: { gap: 6 },
});
