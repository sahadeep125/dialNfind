import { View, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

export type IconTileTone =
  "brand" | "success" | "warning" | "danger" | "neutral" | "accent" | "inverse" | "surface";

interface Props {
  icon: LucideIcon;
  tone?: IconTileTone;
  /** Tile edge length in points. The glyph scales with it. */
  size?: number;
  shape?: "rounded" | "circle";
  style?: StyleProp<ViewStyle>;
}

/** A glyph on a tinted tile. The one way icons are framed across the app: lists, empty states, features. */
export function AppIconTile({
  icon: Icon,
  tone = "brand",
  size = 40,
  shape = "rounded",
  style,
}: Props) {
  const theme = useTheme();
  const { brand, semantic, background, text } = theme.colors;
  const tones: Record<IconTileTone, { bg: string; fg: string }> = {
    brand: { bg: brand.soft, fg: brand.primary },
    success: { bg: semantic.successSoft, fg: semantic.success },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText },
    danger: { bg: semantic.dangerSoft, fg: semantic.danger },
    neutral: { bg: background.tertiary, fg: text.secondary },
    accent: { bg: brand.accentSoft, fg: brand.accentText },
    inverse: { bg: "rgba(255, 255, 255, 0.14)", fg: "#FFFFFF" },
    surface: { bg: background.elevated, fg: brand.primary },
  };
  const { bg, fg } = tones[tone];
  return (
    <View
      style={[
        {
          alignItems: "center",
          backgroundColor: bg,
          borderCurve: "continuous",
          borderRadius: shape === "circle" ? size / 2 : Math.round(size * 0.3),
          height: size,
          justifyContent: "center",
          width: size,
        },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={fg} strokeWidth={size >= 56 ? 1.8 : 2} />
    </View>
  );
}
