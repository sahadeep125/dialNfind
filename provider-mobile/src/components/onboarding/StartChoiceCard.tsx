import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppBadge, AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  icon: ReactNode;
  iconBackground: string;
  title: string;
  badge?: string;
  text: string;
  cta: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A tappable choice on the start screen: icon, title, one line of context, and a chevron. */
export function StartChoiceCard({
  icon,
  iconBackground,
  title,
  badge,
  text,
  cta,
  onPress,
  style,
}: Props) {
  const theme = useTheme();
  return (
    <AppCard
      onPress={onPress}
      accessibilityLabel={`${title}. ${text}. ${cta}`}
      padding={theme.spacing[4]}
      style={style}
    >
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View
          style={[styles.icon, { backgroundColor: iconBackground, borderRadius: theme.radius.md }]}
        >
          {icon}
        </View>
        <View style={styles.body}>
          <View style={[styles.row, { gap: theme.spacing[2] }]}>
            <AppText variant="label" style={styles.shrink}>
              {title}
            </AppText>
            {badge ? <AppBadge label={badge} tone="success" /> : null}
          </View>
          <AppText variant="meta" tone="secondary">
            {text}
          </AppText>
          <AppText
            variant="caption"
            tone="brand"
            style={{ fontFamily: theme.typography.label.fontFamily, marginTop: theme.spacing[1.5] }}
          >
            {cta}
          </AppText>
        </View>
        <ChevronRight size={18} color={theme.colors.text.tertiary} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  icon: {
    alignItems: "center",
    alignSelf: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  body: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
});
