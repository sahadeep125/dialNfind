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
}

export function EmptyState({ icon: Icon, title, text, action }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { padding: theme.spacing[8] }]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.xl },
        ]}
      >
        <Icon size={28} color={theme.colors.brand.primary} strokeWidth={1.8} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="secondary" align="center" style={styles.text}>
        {text}
      </AppText>
      {action ? (
        <View style={[styles.action, { marginTop: theme.spacing[2] }]}>{action}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10, justifyContent: "center" },
  icon: { alignItems: "center", height: 64, justifyContent: "center", marginBottom: 6, width: 64 },
  text: { maxWidth: 320 },
  action: { alignItems: "center", gap: 8, maxWidth: 320, width: "100%" },
});
