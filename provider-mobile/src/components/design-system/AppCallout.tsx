import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

interface Props {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** An inline notice. Title carries the message; the body is one short supporting line. */
export function AppCallout({ tone = "info", title, children, action }: Props) {
  const theme = useTheme();
  const { semantic, brand } = theme.colors;
  const map = {
    info: { bg: brand.soft, fg: brand.softText, icon: brand.primary, Icon: Info },
    warning: {
      bg: semantic.warningSoft,
      fg: semantic.warningText,
      icon: semantic.warning,
      Icon: AlertTriangle,
    },
    success: {
      bg: semantic.successSoft,
      fg: semantic.successText,
      icon: semantic.success,
      Icon: CheckCircle2,
    },
    danger: {
      bg: semantic.dangerSoft,
      fg: semantic.dangerText,
      icon: semantic.danger,
      Icon: XCircle,
    },
  }[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.base,
        {
          backgroundColor: map.bg,
          borderRadius: theme.radius.md,
          gap: theme.spacing[2.5],
          padding: theme.spacing[3],
        },
      ]}
    >
      <map.Icon size={16} color={map.icon} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="label" style={{ color: map.fg }}>
            {title}
          </AppText>
        ) : null}
        {children ? (
          <AppText variant="meta" style={{ color: map.fg }}>
            {children}
          </AppText>
        ) : null}
        {action ? <View style={{ marginTop: theme.spacing[1.5] }}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row" },
  icon: { marginTop: 2 },
  body: { flex: 1, gap: 2 },
});
