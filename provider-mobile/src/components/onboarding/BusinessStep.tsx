import { View } from "react-native";

import { AppInput } from "@/components/design-system";
import { ImageUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Profession } from "@/types";
import type { BusinessDraft, StepErrors } from "@/types/onboarding";
import { ACCOUNT_TYPES } from "@/utils/accountType";
import { ProfessionPicker } from "./ProfessionPicker";
import { StepTitle } from "./StepTitle";

interface Props {
  value: BusinessDraft;
  errors: StepErrors;
  onChange: (patch: Partial<BusinessDraft>) => void;
  /** Individuals only: sets the profession and its main service. */
  onPickProfession: (p: Profession) => void;
  /** The picked profession's name, for the title field's hint. */
  pickedLabel: string | null;
  /** Professions the account already lists (lower case). */
  taken: string[];
  /** Adding another profession: the name is the account's and cannot change here. */
  nameLocked?: boolean;
}

/** About: the name (a person's or a business's), an individual's profession, experience, description, photos. */
export function BusinessStep({ value, errors, onChange, onPickProfession, pickedLabel, taken, nameLocked }: Props) {
  const theme = useTheme();
  const individual = value.businessType === "individual";
  const copy = ACCOUNT_TYPES[value.businessType];
  return (
    <View style={{ gap: theme.layout.sectionGap }}>
      <StepTitle
        title={individual ? "Tell us about yourself" : "Tell us about your business"}
        subtitle={individual ? "Customers see your name and profession first." : "This is what customers see first."}
      />
      <AppInput
        label={copy.nameLabel}
        required
        value={value.businessName}
        onChangeText={(v) => onChange({ businessName: v })}
        error={errors.businessName}
        maxLength={100}
        placeholder={copy.namePlaceholder}
        autoCapitalize="words"
        editable={!nameLocked}
        helper={nameLocked ? "Every profession is listed under the same name." : undefined}
      />

      {individual ? (
        <>
          <ProfessionPicker
            value={value.professionKey}
            taken={taken}
            error={errors.professionKey}
            onPick={onPickProfession}
          />
          <AppInput
            label="Your title"
            helper={`Optional. Shown after your name. Leave empty to use "${pickedLabel ?? "your profession"}".`}
            value={value.profession}
            onChangeText={(v) => onChange({ profession: v })}
            error={errors.profession}
            maxLength={80}
            placeholder="e.g. Senior AC Technician"
            autoCapitalize="words"
          />
        </>
      ) : null}

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
        placeholder={
          individual
            ? "What you do, since when, which brands or areas you know best..."
            : "What do you fix or offer, which brands, what makes you reliable, warranty..."
        }
      />
      <ImageUploadField
        label={individual ? "Your photo" : "Logo"}
        helper={individual ? "Optional. A clear photo of your face builds trust." : "Optional. A square image works best."}
        purpose="logo"
        value={value.logoUrl}
        onChange={(url) => onChange({ logoUrl: url })}
      />
      <ImageUploadField
        label="Cover photo"
        helper={
          individual
            ? "Optional. You at work, or a job you are proud of, in a wide photo."
            : "Optional. Your shop front, team or work in a wide photo."
        }
        purpose="cover"
        value={value.coverUrl}
        onChange={(url) => onChange({ coverUrl: url })}
      />
    </View>
  );
}
