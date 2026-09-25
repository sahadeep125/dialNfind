import { StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react-native";

import { AppCard, AppPressable, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ChecklistItem } from "@/types";

interface Props {
  pct: number;
  checklist: ChecklistItem[];
}

/** Checklist items that live on another screen. The rest are fields on the profile form itself. */
const LINKS: Partial<Record<string, Href>> = {
  services: "/services",
  hours: "/hours",
  areas: "/areas",
  portfolio: "/portfolio",
  verification: "/verification",
};

export function ProfileStrengthCard({ pct, checklist }: Props) {
  const theme = useTheme();
  const todo = checklist.filter((c) => !c.done);
  return (
    <AppCard>
      <View style={[styles.head, { marginBottom: theme.spacing[3] }]}>
        <AppText variant="heading">Profile strength</AppText>
        <AppText variant="title" tone="brand">
          {pct}%
        </AppText>
      </View>
      <AppProgress value={pct} tone={pct >= 80 ? "success" : "brand"} />
      <View style={{ marginTop: theme.spacing[3], gap: theme.spacing[1] }}>
        {todo.length === 0 ? (
          <AppText variant="caption" tone="success">
            Everything is filled in. Nice work.
          </AppText>
        ) : null}
        {todo.map((c) => {
          const href = LINKS[c.key];
          const content = (
            <View style={[styles.item, { gap: theme.spacing[2] }]}>
              <Circle size={16} color={theme.colors.text.tertiary} />
              <AppText
                variant="caption"
                tone={href ? "brand" : "primary"}
                style={styles.flex}
                numberOfLines={2}
              >
                {c.label}
              </AppText>
              {href ? <ChevronRight size={16} color={theme.colors.brand.primary} /> : null}
            </View>
          );
          return href ? (
            <AppPressable
              key={c.key}
              accessibilityRole="link"
              accessibilityLabel={c.label}
              onPress={() => router.push(href)}
            >
              {content}
            </AppPressable>
          ) : (
            <View key={c.key}>{content}</View>
          );
        })}
        {checklist
          .filter((c) => c.done)
          .map((c) => (
            <View key={c.key} style={[styles.item, { gap: theme.spacing[2] }]}>
              <CheckCircle2 size={16} color={theme.colors.semantic.success} />
              <AppText variant="caption" tone="tertiary" style={styles.flex} numberOfLines={2}>
                {c.label}
              </AppText>
            </View>
          ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  item: { alignItems: "center", flexDirection: "row", minHeight: 36 },
  flex: { flex: 1 },
});
