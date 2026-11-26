import { StyleSheet, View } from "react-native";

import { AppInput, AppText } from "@/components/design-system";
import { AppSegmented } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";
import type { ProfileFormErrors, ProfileFormValues } from "@/types/listing";
import { DESCRIPTION_GOOD, DESCRIPTION_MAX } from "./profileForm";
import { FormSection } from "./FormSection";

interface Props {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  /** The account has several listings (one per profession), so it stays an individual's. */
  typeLocked?: boolean;
  /** The main service's profession name, used when no title is typed. */
  defaultProfession?: string | null;
}

const TYPES: SelectOption<ProfileFormValues["businessType"]>[] = [
  { value: "individual", label: "Individual professional" },
  { value: "company", label: "Business" },
];

export function ProfileAboutSection({ values, errors, onChange, typeLocked, defaultProfession }: Props) {
  const theme = useTheme();
  const length = values.description.trim().length;
  const individual = values.businessType === "individual";
  return (
    <FormSection title={individual ? "About you" : "About your business"}>
      <AppInput
        label={individual ? "Your full name" : "Business name"}
        required
        value={values.businessName}
        onChangeText={(businessName) => onChange({ businessName })}
        error={errors.businessName}
        maxLength={100}
        autoCapitalize="words"
      />
      <View style={{ gap: theme.spacing[1.5] }}>
        <AppText variant="caption" tone="secondary" weight="semibold">
          Account type
        </AppText>
        {typeLocked ? (
          <AppText variant="meta">
            Individual professional. You have a listing for each profession, so this account stays an
            individual one.
          </AppText>
        ) : (
          <AppSegmented
            accessibilityLabel="Account type"
            options={TYPES}
            value={values.businessType}
            onChange={(businessType) => onChange({ businessType })}
          />
        )}
      </View>
      {individual ? (
        <AppInput
          label="Your title"
          helper={`Shown after your name. Leave empty to use "${defaultProfession ?? "your main service"}".`}
          value={values.profession}
          onChangeText={(profession) => onChange({ profession })}
          error={errors.profession}
          maxLength={80}
          placeholder="e.g. Senior AC Technician"
          autoCapitalize="words"
        />
      ) : null}
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View style={styles.half}>
          <AppInput
            label={individual ? "Years of experience" : "Years in business"}
            value={values.yearsExperience}
            onChangeText={(v) => onChange({ yearsExperience: v.replace(/\D/g, "") })}
            error={errors.yearsExperience}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="Jobs completed"
            value={values.selfReportedCompletedJobs}
            onChangeText={(v) => onChange({ selfReportedCompletedJobs: v.replace(/\D/g, "") })}
            error={errors.selfReportedCompletedJobs}
            keyboardType="number-pad"
            maxLength={7}
          />
        </View>
      </View>
      <AppInput
        label="Description"
        multiline
        value={values.description}
        onChangeText={(description) => onChange({ description })}
        error={errors.description}
        maxLength={DESCRIPTION_MAX}
        placeholder="What you repair or offer, since when, and what makes you different"
        helper={`${length} / ${DESCRIPTION_MAX} characters. ${DESCRIPTION_GOOD} or more helps you rank higher.`}
      />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
  half: { flexBasis: 140, flexGrow: 1 },
});
