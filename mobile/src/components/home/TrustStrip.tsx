import { StyleSheet, View } from "react-native";
import {
  BadgeCheck,
  BadgeIndianRupee,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react-native";

import {
  AppCard,
  AppDivider,
  AppIconTile,
  AppText,
  type IconTileTone,
} from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

const POINTS: { icon: LucideIcon; tone: IconTileTone; title: string; text: string }[] = [
  {
    icon: BadgeCheck,
    tone: "brand",
    title: "Verified pros",
    text: "Look for the badge: their ID is checked",
  },
  {
    icon: MessageSquareText,
    tone: "warning",
    title: "Real reviews",
    text: "Ratings from customers near you",
  },
  {
    icon: BadgeIndianRupee,
    tone: "success",
    title: "No booking fees",
    text: "Call or WhatsApp and pay them directly",
  },
];

/** Why the directory can be trusted, as a quiet grouped card near the end of Home. */
export function TrustStrip() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <AppText
        variant="overline"
        tone="tertiary"
        accessibilityRole="header"
        style={styles.overline}
      >
        Why DialNFind
      </AppText>
      <AppCard variant="outlined" padding={0}>
        {POINTS.map((p, i) => (
          <View key={p.title}>
            {i ? <AppDivider style={{ marginLeft: 68 }} /> : null}
            <View
              style={[styles.row, { padding: theme.spacing[4] }]}
              accessible
              accessibilityLabel={`${p.title}. ${p.text}`}
            >
              <AppIconTile icon={p.icon} tone={p.tone} size={40} />
              <View style={styles.copy}>
                <AppText variant="label">{p.title}</AppText>
                <AppText variant="caption" tone="secondary">
                  {p.text}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { paddingHorizontal: 4, textTransform: "uppercase" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  copy: { flex: 1, gap: 1 },
});
