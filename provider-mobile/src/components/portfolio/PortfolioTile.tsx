import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ArrowUpDown, Pencil, Star, Trash2 } from "lucide-react-native";

import { AppBadge, AppCard, AppIconButton, AppText } from "@/components/design-system";
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

export const PortfolioTile = memo(function PortfolioTile({ item, width, onEdit, onDelete, onArrange }: Props) {
  const theme = useTheme();
  return (
    <View style={{ width }}>
      <AppCard
        padding={0}
        onPress={() => onEdit(item)}
        accessibilityLabel={`Edit photo ${item.title}`}
        style={styles.card}
      >
        <View style={[styles.imageWrap, { backgroundColor: theme.colors.background.tertiary }]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            accessibilityLabel={item.title}
          />
          {item.isCover ? (
            <View style={[styles.cover, { padding: theme.spacing[1.5] }]}>
              <AppBadge label="Cover" tone="brand" icon={<Star size={11} color={theme.colors.brand.primary} />} />
            </View>
          ) : null}
          <View style={[styles.actions, { gap: theme.spacing[1.5], padding: theme.spacing[1.5] }]}>
            <AppIconButton
              size="sm"
              variant="surface"
              accessibilityLabel={`Move or set ${item.title} as cover`}
              icon={<ArrowUpDown size={15} color={theme.colors.text.primary} />}
              onPress={() => onArrange(item)}
            />
            <AppIconButton
              size="sm"
              variant="surface"
              accessibilityLabel={`Edit ${item.title}`}
              icon={<Pencil size={15} color={theme.colors.text.primary} />}
              onPress={() => onEdit(item)}
            />
            <AppIconButton
              size="sm"
              variant="surface"
              accessibilityLabel={`Delete ${item.title}`}
              icon={<Trash2 size={15} color={theme.colors.semantic.danger} />}
              onPress={() => onDelete(item)}
            />
          </View>
        </View>
        <View style={{ padding: theme.spacing[3], gap: theme.spacing[0.5] }}>
          <AppText variant="label" numberOfLines={1}>
            {item.title}
          </AppText>
          {item.description ? (
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {item.description}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  imageWrap: { aspectRatio: 4 / 3, width: "100%" },
  actions: { flexDirection: "row", position: "absolute", right: 0, top: 0 },
  cover: { left: 0, position: "absolute", top: 0 },
});
