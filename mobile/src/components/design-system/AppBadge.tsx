import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}

export function AppBadge({ label, tone = "neutral", icon }: Props) {
  const theme = useTheme();
  const { semantic, brand, background, text } = theme.colors;
  const colors: Record<BadgeTone, { bg: string; fg: string }> = {
    brand: { bg: brand.soft, fg: brand.softText },
    success: { bg: semantic.successSoft, fg: semantic.success },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText },
    danger: { bg: semantic.dangerSoft, fg: semantic.danger },
    neutral: { bg: background.tertiary, fg: text.secondary },
  };
  return (
    <View style={[styles.base, { backgroundColor: colors[tone].bg }]}>
      {icon}
      <AppText
        variant="overline"
        style={{ color: colors[tone].fg, letterSpacing: 0.2 }}
        numberOfLines={1}
      >
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
    paddingVertical: 3,
  },
});
