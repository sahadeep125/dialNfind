import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";

import { AppSkeleton } from "@/components/design-system";
import { CategoryTile } from "@/components/categories";
import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";

interface Props {
  categories: Category[] | undefined;
  loading: boolean;
}

const GAP = 10;
const MIN_TILE = 96;

/** Category tiles that reflow to fit: four across on phones, more on tablets. */
export function CategoryGrid({ categories, loading }: Props) {
  const theme = useTheme();
  const window = useWindowDimensions();
  // Start from the screen width so tiles draw on the first frame; onLayout then gives the exact width.
  const [measured, setMeasured] = useState(0);
  const width = measured || Math.min(window.width, MAX_CONTENT_WIDTH) - theme.spacing[4] * 2;
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width),
    [],
  );
  const perRow = Math.max(3, Math.min(6, Math.floor((width + GAP) / (MIN_TILE + GAP))));
  const tileWidth = width ? Math.floor((width - GAP * (perRow - 1)) / perRow) : 0;
  const open = useCallback((c: Category) => router.push(`/category/${c.slug}`), []);

  return (
    <View onLayout={onLayout} style={styles.grid}>
      {!tileWidth
        ? null
        : loading || !categories
          ? Array.from({ length: perRow * 2 }, (_, i) => (
              <AppSkeleton key={i} shape="block" width={tileWidth} height={112} />
            ))
          : categories.map((c) => (
              <CategoryTile key={c.id} category={c} width={tileWidth} onPress={open} />
            ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
});
