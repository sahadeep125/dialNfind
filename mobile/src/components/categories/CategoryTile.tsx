import { memo } from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { CATEGORY_STYLES, FALLBACK_CATEGORY_STYLE } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";

interface TileProps {
  label: string;
  accessibilityLabel: string;
  icon: LucideIcon;
  /** Glyph color; the tile itself is always the neutral card surface. */
  color: string;
  width: number;
  onPress: () => void;
}

/** A square card with a colored glyph and a two-line label under it, so every row lines up. */
export function Tile({ label, accessibilityLabel, icon: Icon, color, width, onPress }: TileProps) {
  const theme = useTheme();
  const box = Math.round(width * 0.86);
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.tile, { width }]}
    >
      <View
        style={[
          styles.box,
          {
            width: box,
            height: box,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.background.elevated,
            borderColor: theme.colors.border.primary,
          },
          theme.shadow.sm,
        ]}
      >
        <Icon size={Math.round(box * 0.4)} color={color} strokeWidth={1.8} />
      </View>
      <AppText
        variant="labelSmall"
        align="center"
        numberOfLines={2}
        style={{ minHeight: theme.typography.labelSmall.lineHeight * 2 }}
      >
        {label}
      </AppText>
    </AppPressable>
  );
}

interface Props {
  category: Category;
  width: number;
  onPress: (category: Category) => void;
}

/** A category in the Home grid. */
export const CategoryTile = memo(function CategoryTile({ category, width, onPress }: Props) {
  const theme = useTheme();
  const style = CATEGORY_STYLES[category.slug] ?? FALLBACK_CATEGORY_STYLE;
  return (
    <Tile
      label={category.name}
      accessibilityLabel={`${category.name}, ${category.providerCount} providers`}
      icon={style.icon}
      color={style[theme.mode].fg}
      width={width}
      onPress={() => onPress(category)}
    />
  );
});

const styles = StyleSheet.create({
  tile: { alignItems: "center", gap: 8 },
  box: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
});
