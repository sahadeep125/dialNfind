import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "@/hooks/useTheme";
import { initials } from "@/utils/format";
import { AppText } from "./AppText";

interface Props {
  name: string;
  uri?: string | null;
  size?: number;
  shape?: "circle" | "rounded";
}

/** Photo when there is one, otherwise the person's or business's initials on a brand tint. */
export function AppAvatar({ name, uri, size = 44, shape = "circle" }: Props) {
  const theme = useTheme();
  const radius = shape === "circle" ? size / 2 : Math.round(size * 0.28);
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.colors.brand.soft,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppText
          variant="label"
          style={{ color: theme.colors.brand.softText, fontSize: Math.max(12, size * 0.36) }}
        >
          {initials(name) || "?"}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
