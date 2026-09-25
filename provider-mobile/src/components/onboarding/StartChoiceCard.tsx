import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ArrowRight } from "lucide-react-native";

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

/** A large tappable choice on the start screen: claim a listing or create a new one. */
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
      accessibilityLabel={`${title}. ${cta}`}
      padding={theme.spacing[5]}
      style={style}
    >
      <View style={{ gap: theme.spacing[3] }}>
        <View
          style={[styles.icon, { backgroundColor: iconBackground, borderRadius: theme.radius.md }]}
        >
          {icon}
        </View>
        <View style={[styles.row, styles.wrap]}>
          <AppText variant="heading">{title}</AppText>
          {badge ? <AppBadge label={badge} tone="success" /> : null}
        </View>
        <AppText variant="caption" tone="secondary">
          {text}
        </AppText>
        <View style={styles.row}>
          <AppText variant="label" tone="brand">
            {cta}
          </AppText>
          <ArrowRight size={16} color={theme.colors.brand.primary} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  wrap: { flexWrap: "wrap" },
});
