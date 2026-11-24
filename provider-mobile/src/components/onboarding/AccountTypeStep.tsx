import { StyleSheet, View } from "react-native";
import { Building2, UserRound } from "lucide-react-native";

import { AppBadge, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { BusinessType } from "@/types/onboarding";
import { ACCOUNT_TYPES } from "@/utils/accountType";
import { StepTitle } from "./StepTitle";

interface Props {
  value: BusinessType;
  onChange: (type: BusinessType) => void;
}

const ORDER: BusinessType[] = ["individual", "company"];

/** Step 1: is this a person offering their own services, or a business? Individual comes first. */
export function AccountTypeStep({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.layout.sectionGap }}>
      <StepTitle
        title="How do you work?"
        subtitle="This decides how customers see your listing. You can change it later from your profile."
      />
      <View
        style={{ gap: theme.spacing[3] }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Account type"
      >
        {ORDER.map((t) => {
          const selected = value === t;
          const copy = ACCOUNT_TYPES[t];
          const Icon = t === "individual" ? UserRound : Building2;
          const tint =
            t === "individual" ? theme.colors.brand.accentText : theme.colors.brand.primary;
          return (
            <AppPressable
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${copy.label}. ${copy.text}`}
              onPress={() => onChange(t)}
              style={[
                styles.card,
                {
                  gap: theme.spacing[3],
                  padding: theme.spacing[4],
                  borderRadius: theme.radius.md,
                  borderColor: selected ? theme.colors.brand.primary : theme.colors.border.primary,
                  borderWidth: selected ? theme.borderWidth.focus : theme.borderWidth.default,
                  backgroundColor: selected
                    ? theme.colors.brand.soft
                    : theme.colors.background.elevated,
                },
              ]}
            >
              <View
                style={[
                  styles.icon,
                  {
                    borderRadius: theme.radius.md,
                    backgroundColor:
                      t === "individual"
                        ? theme.colors.brand.accentSoft
                        : theme.colors.background.subtle,
                  },
                ]}
              >
                <Icon size={22} color={tint} />
              </View>
              <View style={[styles.body, { gap: theme.spacing[1] }]}>
                <View style={[styles.row, { gap: theme.spacing[2] }]}>
                  <AppText variant="label">{copy.label}</AppText>
                  {t === "individual" ? <AppBadge label="Most popular" tone="brand" /> : null}
                </View>
                <AppText variant="meta" tone="secondary">
                  {copy.text}
                </AppText>
              </View>
            </AppPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "flex-start", flexDirection: "row" },
  icon: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  body: { flex: 1, minWidth: 0 },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
});
