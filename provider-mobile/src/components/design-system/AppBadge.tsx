import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  /** A small status dot before the label, for live states such as "Live" or "Awaiting approval". */
  dot?: boolean;
  /** "soft" is a tinted pill; "outline" is a quieter bordered pill for use on busy rows. */
  appearance?: "soft" | "outline";
}

/** A status pill. Reads at a glance, never carries a sentence. */
export function AppBadge({
  label,
  tone = "neutral",
  icon,
  dot = false,
  appearance = "soft",
}: Props) {
  const theme = useTheme();
  const { semantic, brand, background, text, border } = theme.colors;
  const colors: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
    brand: { bg: brand.soft, fg: brand.softText, dot: brand.primary },
    success: { bg: semantic.successSoft, fg: semantic.successText, dot: semantic.success },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText, dot: semantic.warning },
    danger: { bg: semantic.dangerSoft, fg: semantic.dangerText, dot: semantic.danger },
    neutral: { bg: background.subtle, fg: text.secondary, dot: text.tertiary },
  };
  const c = colors[tone];
  const outline = appearance === "outline";
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: outline ? "transparent" : c.bg,
          borderColor: outline ? border.primary : c.bg,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: c.dot }]} /> : null}
      {icon}
      <AppText variant="caption" style={{ color: c.fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  dot: { borderRadius: 3, height: 6, width: 6 },
});
