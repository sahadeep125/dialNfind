import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  AlertTriangle,
  ChevronRight,
  Info,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppPressable } from "./AppPressable";
import { AppText } from "./AppText";

export type NoticeTone = "info" | "warning" | "danger" | "upgrade";

interface Props {
  tone?: NoticeTone;
  title: string;
  text?: string;
  icon?: LucideIcon;
  /** A short verb on the right, e.g. "Upgrade". Without it a chevron shows when onPress is set. */
  actionLabel?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}

/** A single-row attention strip: what needs doing, and one tap to do it. Never stack more than one. */
export function AppNotice({
  tone = "info",
  title,
  text,
  icon,
  actionLabel,
  onPress,
  trailing,
}: Props) {
  const theme = useTheme();
  const { brand, semantic } = theme.colors;
  const map = {
    info: { bg: brand.soft, fg: brand.softText, accent: brand.primary, Icon: Info },
    upgrade: { bg: brand.soft, fg: brand.softText, accent: brand.primary, Icon: Sparkles },
    warning: {
      bg: semantic.warningSoft,
      fg: semantic.warningText,
      accent: semantic.warning,
      Icon: AlertTriangle,
    },
    danger: {
      bg: semantic.dangerSoft,
      fg: semantic.dangerText,
      accent: semantic.danger,
      Icon: XCircle,
    },
  }[tone];
  const Icon = icon ?? map.Icon;

  const body = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: map.bg,
          borderRadius: theme.radius.md,
          gap: theme.spacing[2.5],
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[2.5],
        },
      ]}
    >
      <Icon size={16} color={map.accent} />
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={1} style={{ color: map.fg }}>
          {title}
        </AppText>
        {text ? (
          <AppText variant="meta" numberOfLines={2} style={{ color: map.fg, opacity: 0.85 }}>
            {text}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {actionLabel ? (
        <View
          style={[styles.action, { backgroundColor: map.accent, borderRadius: theme.radius.sm }]}
        >
          <AppText
            variant="caption"
            tone="white"
            style={{ fontFamily: theme.typography.label.fontFamily }}
          >
            {actionLabel}
          </AppText>
        </View>
      ) : onPress ? (
        <ChevronRight size={16} color={map.fg} />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={text ? `${title}. ${text}` : title}
      onPress={onPress}
      scale={false}
    >
      {body}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1, gap: 1, minWidth: 0 },
  action: { paddingHorizontal: 10, paddingVertical: 5 },
});
