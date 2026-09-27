import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
  /** compact: for use inside a section, with less padding. */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, text, action, compact = false }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { padding: compact ? theme.spacing[5] : theme.spacing[8], gap: theme.spacing[1.5] },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.background.subtle, marginBottom: theme.spacing[2] },
        ]}
      >
        <Icon size={20} color={theme.colors.text.secondary} strokeWidth={1.8} />
      </View>
      <AppText variant="section" align="center">
        {title}
      </AppText>
      <AppText variant="meta" tone="secondary" align="center" style={styles.text}>
        {text}
      </AppText>
      {action ? (
        <View style={[styles.action, { marginTop: theme.spacing[3] }]}>{action}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  icon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  text: { maxWidth: 300 },
  action: { alignItems: "center", gap: 8, maxWidth: 300 },
});
