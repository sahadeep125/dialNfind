import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ChevronRight } from "lucide-react-native";

import { AppCard, AppText } from "@/components/design-system";
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

function Ring({ pct, size = 40 }: { pct: number; size?: number }) {
  const theme = useTheme();
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? theme.colors.semantic.success : theme.colors.brand.primary;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.background.subtle}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <AppText
        variant="caption"
        numeric
        style={{ fontSize: 11, fontFamily: theme.typography.label.fontFamily }}
      >
        {pct}
      </AppText>
    </View>
  );
}

/** Profile strength in one row: a ring, the next thing to do, and a tap straight to where it is fixed. */
export function CompletenessCard({ pct, checklist, onOpen }: Props) {
  const theme = useTheme();
  const todo = checklist.filter((c) => !c.done);
  const next = todo[0];
  if (!next) return null;
  return (
    <AppCard
      padding={theme.spacing[3]}
      onPress={() => onOpen(CHECKLIST_LINKS[next.key] ?? "/profile")}
      accessibilityLabel={`Profile ${pct} percent complete. Next: ${next.label}`}
    >
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <Ring pct={pct} />
        <View style={styles.body}>
          <AppText variant="label">Profile {pct}% complete</AppText>
          <AppText variant="meta" tone="secondary" numberOfLines={1}>
            Next: {next.label}
            {todo.length > 1 ? ` · ${todo.length - 1} more` : ""}
          </AppText>
        </View>
        <ChevronRight size={16} color={theme.colors.text.tertiary} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1, gap: 1, minWidth: 0 },
});
