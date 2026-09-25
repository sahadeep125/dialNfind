import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}

/** One number on a campaign card, such as views or amount spent. */
export function CampaignStat({ icon: Icon, label, value, hint }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.colors.background.tertiary,
          borderRadius: theme.radius.md,
          padding: theme.spacing[3],
        },
      ]}
    >
      <View style={styles.label}>
        <Icon size={13} color={theme.colors.text.secondary} />
        <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
          {label}
        </AppText>
      </View>
      <AppText variant="subheading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexBasis: 96, flexGrow: 1, gap: 2, minWidth: 0 },
  label: { alignItems: "center", flexDirection: "row", gap: 4 },
  flex: { flexShrink: 1 },
});
