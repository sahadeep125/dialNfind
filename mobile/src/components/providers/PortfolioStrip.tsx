import { FlatList, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderDetail } from "@/types";

interface Props {
  items: ProviderDetail["portfolio"];
  /** Opens the full-screen viewer on the tapped photo. */
  onOpen?: (index: number) => void;
}

/** Horizontally scrolling photos of past work. */
export function PortfolioStrip({ items, onOpen }: Props) {
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => String(item.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      renderItem={({ item, index }) => (
        <AppPressable
          style={styles.item}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${item.title}. Open full screen`}
          disabled={!onOpen}
          onPress={() => onOpen?.(index)}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={[
              styles.image,
              { borderRadius: theme.radius.lg, backgroundColor: theme.colors.background.tertiary },
            ]}
            contentFit="cover"
            accessibilityLabel={item.title}
            transition={150}
          />
          <AppText variant="labelSmall" tone="secondary" numberOfLines={1}>
            {item.title}
          </AppText>
        </AppPressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: 12 },
  item: { gap: 8, width: 200 },
  image: { height: 140, width: 200 },
});
