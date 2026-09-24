import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { AppText } from "./AppText";

interface Props {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function AppCallout({ tone = "info", title, children, action }: Props) {
  const theme = useTheme();
  const { semantic, brand } = theme.colors;
  const map = {
    info: { bg: brand.soft, fg: brand.softText, Icon: Info },
    warning: { bg: semantic.warningSoft, fg: semantic.warningText, Icon: AlertTriangle },
    success: { bg: semantic.successSoft, fg: semantic.success, Icon: CheckCircle2 },
    danger: { bg: semantic.dangerSoft, fg: semantic.danger, Icon: XCircle },
  }[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.base, { backgroundColor: map.bg, borderRadius: theme.radius.md }]}
    >
      <map.Icon size={18} color={map.fg} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="label" style={{ color: map.fg }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" style={{ color: map.fg }}>
          {children}
        </AppText>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", gap: 10, padding: 12 },
  body: { flex: 1, gap: 4 },
});
