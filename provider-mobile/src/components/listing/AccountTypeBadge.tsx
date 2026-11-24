import { StyleSheet, View } from "react-native";
import { Building2, UserRound } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { BusinessType } from "@/types/onboarding";

/**
 * Who the listing is: an individual professional (a person, orange) or a business (a building, blue).
 * The customer website and app use the same icons, words and colours.
 */
export function AccountTypeBadge({ type }: { type: BusinessType }) {
  const theme = useTheme();
  const individual = type === "individual";
  const Icon = individual ? UserRound : Building2;
  const fg = individual ? theme.colors.brand.accentText : theme.colors.brand.softText;
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: individual ? theme.colors.brand.accentSoft : theme.colors.brand.soft,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      <Icon size={12} color={fg} />
      <AppText variant="caption" style={{ color: fg }} numberOfLines={1}>
        {individual ? "Individual professional" : "Business"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
