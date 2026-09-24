import { StyleSheet, View } from "react-native";

import { CATEGORY_STYLES, FALLBACK_CATEGORY_STYLE } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  slug?: string | null;
  size?: number;
}

export function CategoryIcon({ slug, size = 48 }: Props) {
  const theme = useTheme();
  const style = (slug && CATEGORY_STYLES[slug]) || FALLBACK_CATEGORY_STYLE;
  const tone = style[theme.mode];
  const Icon = style.icon;
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: tone.bg,
        },
      ]}
    >
      <Icon size={Math.round(size * 0.5)} color={tone.fg} strokeWidth={1.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
