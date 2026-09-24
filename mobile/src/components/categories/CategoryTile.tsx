import { memo } from "react";
import { StyleSheet } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  category: Category;
  width: number;
  onPress: (category: Category) => void;
}

export const CategoryTile = memo(function CategoryTile({ category, width, onPress }: Props) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.providerCount} providers`}
      onPress={() => onPress(category)}
      style={[
        styles.tile,
        {
          width,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.background.elevated,
          borderColor: theme.colors.border.primary,
        },
      ]}
    >
      <CategoryIcon slug={category.slug} size={46} />
      <AppText
        variant="caption"
        align="center"
        numberOfLines={2}
        style={{ fontFamily: theme.typography.label.fontFamily }}
      >
        {category.name}
      </AppText>
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
    minHeight: 112,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
});
