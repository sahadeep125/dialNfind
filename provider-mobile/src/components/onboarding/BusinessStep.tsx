import { StyleSheet, View } from "react-native";
import { Building2, UserRound } from "lucide-react-native";

import { AppInput, AppPressable, AppText } from "@/components/design-system";
import { ImageUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { BusinessDraft, BusinessType, StepErrors } from "@/types/onboarding";
import { StepTitle } from "./StepTitle";

interface Props {
  value: BusinessDraft;
  errors: StepErrors;
  onChange: (patch: Partial<BusinessDraft>) => void;
}

const TYPES: { value: BusinessType; title: string; text: string }[] = [
  {
    value: "individual",
    title: "An individual professional",
    text: "Freelancer, technician, tutor",
  },
  { value: "company", title: "A company or shop", text: "Team, service centre, agency" },
];

/** Step 1: name, type, experience, description, logo and cover photo. */
export function BusinessStep({ value, errors, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[5] }}>
      <StepTitle title="Tell us about your business" subtitle="This is what customers see first." />
      <AppInput
        label="Business name"
        required
        value={value.businessName}
        onChangeText={(v) => onChange({ businessName: v })}
        error={errors.businessName}
        maxLength={100}
        placeholder="e.g. Sharma TV & Electronics Care"
        autoCapitalize="words"
      />

      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="secondary">
          You are
        </AppText>
        <View style={[styles.types, { gap: theme.spacing[2] }]} accessibilityRole="radiogroup">
          {TYPES.map((t) => {
            const selected = value.businessType === t.value;
            const Icon = t.value === "individual" ? UserRound : Building2;
            return (
              <AppPressable
                key={t.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${t.title}. ${t.text}`}
                onPress={() => onChange({ businessType: t.value })}
                style={[
                  styles.type,
                  {
                    gap: theme.spacing[1],
                    padding: theme.spacing[3],
                    borderRadius: theme.radius.md,
                    borderColor: selected
                      ? theme.colors.brand.primary
                      : theme.colors.border.primary,
                    borderWidth: selected ? theme.borderWidth.focus : theme.borderWidth.default,
                    backgroundColor: selected
                      ? theme.colors.brand.soft
                      : theme.colors.background.elevated,
                  },
                ]}
              >
                <Icon
                  size={20}
                  color={selected ? theme.colors.brand.primary : theme.colors.text.secondary}
                />
                <AppText variant="label">{t.title}</AppText>
                <AppText variant="caption" tone="secondary">
                  {t.text}
                </AppText>
              </AppPressable>
            );
          })}
        </View>
      </View>

      <AppInput
        label="Years of experience"
        helper="Optional"
        value={value.yearsExperience}
        onChangeText={(v) => onChange({ yearsExperience: v.replace(/\D/g, "").slice(0, 2) })}
        error={errors.yearsExperience}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="e.g. 8"
      />
      <AppInput
        label="Description"
        helper={`Optional. ${value.description.length} of 2,000 characters. 80 or more helps you rank higher.`}
        value={value.description}
        onChangeText={(v) => onChange({ description: v })}
        error={errors.description}
        multiline
        maxLength={2000}
        placeholder="What do you fix or offer, which brands, what makes you reliable, warranty..."
      />
      <ImageUploadField
        label="Logo"
        helper="Optional. A square image works best."
        purpose="logo"
        value={value.logoUrl}
        onChange={(url) => onChange({ logoUrl: url })}
      />
      <ImageUploadField
        label="Cover photo"
        helper="Optional. Your shop front, team or work in a wide photo."
        purpose="cover"
        value={value.coverUrl}
        onChange={(url) => onChange({ coverUrl: url })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: "row", flexWrap: "wrap" },
  type: { flexBasis: 140, flexGrow: 1 },
});
