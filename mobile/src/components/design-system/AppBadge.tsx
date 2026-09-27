import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { fontFamily } from "@/constants/typography";
import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral" | "accent";

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  /** A small status dot before the label, e.g. for "Open now". */
  dot?: boolean;
}

/** Small read-only tag for status and facts. Not tappable; use AppChip for choices. */
export function AppBadge({ label, tone = "neutral", icon: Icon, dot = false }: Props) {
  const theme = useTheme();
  const { semantic, brand, background, text } = theme.colors;
  const colors: Record<BadgeTone, { bg: string; fg: string }> = {
    brand: { bg: brand.soft, fg: brand.softText },
    success: { bg: semantic.successSoft, fg: semantic.success },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText },
    danger: { bg: semantic.dangerSoft, fg: semantic.danger },
    neutral: { bg: background.tertiary, fg: text.secondary },
    accent: { bg: brand.accentSoft, fg: brand.accentText },
  };
  const { bg, fg } = colors[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      {Icon ? <Icon size={12} color={fg} strokeWidth={2.4} /> : null}
      <AppText variant="micro" style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 9999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: { borderRadius: 3, height: 6, width: 6 },
  label: { fontFamily: fontFamily.bodySemiBold },
});
