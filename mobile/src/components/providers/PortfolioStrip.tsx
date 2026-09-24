import { FlatList, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderDetail } from "@/types";

interface Props {
  items: ProviderDetail["portfolio"];
}

/** Horizontally scrolling photos of past work. */
export function PortfolioStrip({ items }: Props) {
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => String(item.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Image
            source={{ uri: item.imageUrl }}
            style={[
              styles.image,
              { borderRadius: theme.radius.md, backgroundColor: theme.colors.background.tertiary },
            ]}
            contentFit="cover"
            accessibilityLabel={item.title}
            transition={150}
          />
          <AppText variant="caption" numberOfLines={1}>
            {item.title}
          </AppText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: 12 },
  item: { gap: 6, width: 180 },
  image: { height: 130, width: 180 },
});
