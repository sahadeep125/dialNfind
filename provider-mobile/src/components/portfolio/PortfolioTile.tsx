import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ArrowUpDown, Star, Trash2 } from "lucide-react-native";

import { AppBadge, AppIconButton, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { PortfolioItem } from "@/types";

interface Props {
  item: PortfolioItem;
  width: number;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (item: PortfolioItem) => void;
  /** Opens move and set-as-cover actions. */
  onArrange: (item: PortfolioItem) => void;
}

/** A square photo with its title underneath. Tap the photo to edit; arrange and delete sit beside the title. */
export const PortfolioTile = memo(function PortfolioTile({
  item,
  width,
  onEdit,
  onDelete,
  onArrange,
}: Props) {
  const theme = useTheme();
  return (
    <View style={{ width, gap: theme.spacing[1.5] }}>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`Edit photo ${item.title}`}
        onPress={() => onEdit(item)}
        scale={false}
        style={[
          styles.imageWrap,
          { backgroundColor: theme.colors.background.subtle, borderRadius: theme.radius.md },
        ]}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityLabel={item.title}
        />
        {item.isCover ? (
          <View style={[styles.cover, { padding: theme.spacing[1.5] }]}>
            <AppBadge
              label="Cover"
              tone="brand"
              icon={
                <Star
                  size={10}
                  color={theme.colors.brand.primary}
                  fill={theme.colors.brand.primary}
                />
              }
            />
          </View>
        ) : null}
      </AppPressable>
      <View style={[styles.row, { gap: 2 }]}>
        <View style={styles.text}>
          <AppText variant="caption" weight="semibold" numberOfLines={1}>
            {item.title}
          </AppText>
          {item.description ? (
            <AppText variant="meta" numberOfLines={1}>
              {item.description}
            </AppText>
          ) : null}
        </View>
        <AppIconButton
          size="sm"
          accessibilityLabel={`Move or set ${item.title} as cover`}
          icon={<ArrowUpDown size={14} color={theme.colors.text.secondary} />}
          onPress={() => onArrange(item)}
        />
        <AppIconButton
          size="sm"
          accessibilityLabel={`Delete ${item.title}`}
          icon={<Trash2 size={14} color={theme.colors.text.tertiary} />}
          onPress={() => onDelete(item)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  imageWrap: { aspectRatio: 1, overflow: "hidden", width: "100%" },
  row: { alignItems: "center", flexDirection: "row" },
  text: { flex: 1, minWidth: 0 },
  cover: { left: 0, position: "absolute", top: 0 },
});
