import { StyleSheet, View } from "react-native";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react-native";

import { AppCard, AppPressable, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { SectionHeader } from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";
import type { ChecklistItem } from "@/types";

/** Screen that fixes each checklist item. */
const CHECKLIST_LINKS: Record<string, string> = {
  description: "/profile",
  logo: "/profile",
  cover: "/profile",
  experience: "/profile",
  whatsapp: "/profile",
  address: "/profile",
  contact: "/profile",
  services: "/services",
  hours: "/hours",
  areas: "/areas",
  portfolio: "/portfolio",
  verification: "/verification",
};

interface Props {
  pct: number;
  checklist: ChecklistItem[];
  onOpen: (path: string) => void;
}

/** Profile strength with the next few things to do, each linking to where it is fixed. */
export function CompletenessCard({ pct, checklist, onOpen }: Props) {
  const theme = useTheme();
  const todo = checklist.filter((c) => !c.done);
  const shown = todo.length ? todo.slice(0, 4) : checklist.slice(0, 3);
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[3] }}>
        <SectionHeader
          title="Profile strength"
          subtitle={
            todo.length
              ? `${todo.length} ${todo.length === 1 ? "step" : "steps"} left to a complete profile`
              : "Your profile is complete"
          }
        />
        <View style={[styles.progress, { gap: theme.spacing[3] }]}>
          <View style={styles.fill}>
            <AppProgress value={pct} tone={pct >= 80 ? "success" : "brand"} height={10} />
          </View>
          <AppText variant="label">{pct}%</AppText>
        </View>
        <View>
          {shown.map((c) => (
            <AppPressable
              key={c.key}
              accessibilityRole="link"
              accessibilityLabel={`${c.label}${c.done ? ", done" : ""}`}
              onPress={() => onOpen(CHECKLIST_LINKS[c.key] ?? "/profile")}
              scale={false}
              style={[styles.item, { gap: theme.spacing[3] }]}
            >
              {c.done ? (
                <CheckCircle2 size={18} color={theme.colors.semantic.success} />
              ) : (
                <Circle size={18} color={theme.colors.text.tertiary} />
              )}
              <AppText style={styles.fill}>{c.label}</AppText>
              <ChevronRight size={18} color={theme.colors.text.tertiary} />
            </AppPressable>
          ))}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  progress: { alignItems: "center", flexDirection: "row" },
  fill: { flex: 1 },
  item: { alignItems: "center", flexDirection: "row", minHeight: 44 },
});
