import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { ChevronRight, Circle, PartyPopper } from "lucide-react-native";

import { AppCard, AppDivider, AppPressable, AppText } from "@/components/design-system";
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

const PREVIEW = 3;

/** Completeness and the few things still missing. Items on other screens link there. */
export function ProfileStrengthCard({ pct, checklist }: Props) {
  const theme = useTheme();
  const [all, setAll] = useState(false);
  const todo = checklist.filter((c) => !c.done);
  const shown = all ? todo : todo.slice(0, PREVIEW);

  return (
    <AppCard padding={0}>
      <View style={{ padding: 14, gap: theme.spacing[2] }}>
        <View style={styles.head}>
          <AppText variant="label">Profile strength</AppText>
          <AppText variant="label" numeric tone={pct >= 80 ? "success" : "brand"}>
            {pct}%
          </AppText>
        </View>
        <AppProgress value={pct} tone={pct >= 80 ? "success" : "brand"} height={5} />
        {todo.length === 0 ? (
          <View style={[styles.item, { gap: theme.spacing[2] }]}>
            <PartyPopper size={14} color={theme.colors.semantic.success} />
            <AppText variant="meta" tone="success">
              Everything is filled in. Nice work.
            </AppText>
          </View>
        ) : (
          <AppText variant="meta">
            {todo.length} {todo.length === 1 ? "thing" : "things"} left. Complete profiles get more
            calls.
          </AppText>
        )}
      </View>
      {shown.map((c) => {
        const href = LINKS[c.key];
        return (
          <View key={c.key}>
            <AppDivider inset={14} />
            <AppPressable
              accessibilityRole={href ? "link" : "text"}
              accessibilityLabel={c.label}
              disabled={!href}
              onPress={href ? () => router.push(href) : undefined}
              scale={false}
              style={[
                styles.item,
                { gap: theme.spacing[2.5], paddingHorizontal: 14, minHeight: 42 },
              ]}
            >
              <Circle size={14} color={theme.colors.text.tertiary} />
              <AppText variant="body" style={styles.flex} numberOfLines={1}>
                {c.label}
              </AppText>
              {href ? (
                <ChevronRight size={16} color={theme.colors.text.tertiary} />
              ) : (
                <AppText variant="meta">Below</AppText>
              )}
            </AppPressable>
          </View>
        );
      })}
      {todo.length > PREVIEW ? (
        <>
          <AppDivider inset={14} />
          <AppPressable
            accessibilityRole="button"
            onPress={() => setAll((v) => !v)}
            style={[styles.item, { paddingHorizontal: 14, minHeight: 40 }]}
          >
            <AppText variant="caption" tone="brand">
              {all ? "Show less" : `Show ${todo.length - PREVIEW} more`}
            </AppText>
          </AppPressable>
        </>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  item: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
});
