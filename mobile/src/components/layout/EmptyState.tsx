import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppIconTile, AppText, type IconTileTone } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
  tone?: IconTileTone;
}

/** Friendly placeholder for empty lists, sign-in walls and errors: icon, title, one line, one action. */
export function EmptyState({ icon, title, text, action, tone = "brand" }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { padding: theme.spacing[8] }]}>
      <View style={[styles.halo, { backgroundColor: theme.colors.background.tertiary }]}>
        <AppIconTile icon={icon} tone={tone} size={64} shape="circle" />
      </View>
      <AppText variant="heading" align="center" style={styles.title}>
        {title}
      </AppText>
      <AppText tone="secondary" align="center" style={styles.text}>
        {text}
      </AppText>
      {action ? (
        <View style={[styles.action, { marginTop: theme.spacing[3] }]}>{action}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", flexGrow: 1, gap: 8, justifyContent: "center" },
  halo: {
    alignItems: "center",
    borderRadius: 52,
    height: 104,
    justifyContent: "center",
    marginBottom: 12,
    width: 104,
  },
  title: { maxWidth: 340 },
  text: { maxWidth: 340 },
  action: { alignItems: "stretch", gap: 8, maxWidth: 320, width: "100%" },
});
