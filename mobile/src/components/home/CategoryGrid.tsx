import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";
import { LayoutGrid } from "lucide-react-native";

import { AppSkeleton } from "@/components/design-system";
import { CategoryTile, Tile } from "@/components/categories";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";

interface Props {
  categories: Category[] | undefined;
  loading: boolean;
  /** Show at most this many rows; the last tile opens the All services screen. */
  rows?: number;
}

const GAP_X = 10;
const GAP_Y = 16;
const MIN_TILE = 76;

/** Category tiles that reflow to fit: four across on phones, up to eight on tablets. */
export function CategoryGrid({ categories, loading, rows }: Props) {
  const theme = useTheme();
  const window = useWindowDimensions();
  // Start from the screen width so tiles draw on the first frame; onLayout then gives the exact width.
  const [measured, setMeasured] = useState(0);
  const width = measured || window.width - theme.spacing[4] * 2;
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width),
    [],
  );
  const perRow = Math.max(4, Math.min(8, Math.floor((width + GAP_X) / (MIN_TILE + GAP_X))));
  const tileWidth = width ? Math.floor((width - GAP_X * (perRow - 1)) / perRow) : 0;
  const open = useCallback((c: Category) => router.push(`/category/${c.slug}`), []);
  const openAll = useCallback(() => router.push("/categories"), []);
  const limit = rows ? perRow * rows : undefined;
  // When the list is cut short, the last slot becomes "All services".
  const truncated = !!limit && !!categories && categories.length > limit;
  const shown = truncated ? categories.slice(0, limit - 1) : categories;

  return (
    <View onLayout={onLayout} style={styles.grid}>
      {!tileWidth
        ? null
        : loading || !shown
          ? Array.from({ length: limit ?? perRow * 2 }, (_, i) => (
              <View key={i} style={[styles.placeholder, { width: tileWidth }]}>
                <AppSkeleton
                  shape="block"
                  width={Math.round(tileWidth * 0.86)}
                  height={Math.round(tileWidth * 0.86)}
                />
                <AppSkeleton width={tileWidth * 0.7} height={10} />
              </View>
            ))
          : [
              ...shown.map((c) => (
                <CategoryTile key={c.id} category={c} width={tileWidth} onPress={open} />
              )),
              truncated ? (
                <Tile
                  key="all"
                  label="All services"
                  accessibilityLabel="See all services"
                  icon={LayoutGrid}
                  color={theme.colors.brand.primary}
                  width={tileWidth}
                  onPress={openAll}
                />
              ) : null,
            ]}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { columnGap: GAP_X, flexDirection: "row", flexWrap: "wrap", rowGap: GAP_Y },
  placeholder: { alignItems: "center", gap: 10 },
});
