import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import { useSaveProfile } from "@/hooks/useSaveProfile";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import type { ProviderProfile } from "@/types";
import type { ProfileFormErrors, ProfileFormValues } from "@/types/listing";
import { isValid } from "@/utils/validation";
import { ProfileAboutSection } from "./ProfileAboutSection";
import { ProfileBrandingSection } from "./ProfileBrandingSection";
import { ProfileContactSection } from "./ProfileContactSection";
import { ProfileLocationSection } from "./ProfileLocationSection";
import { ProfileStrengthCard } from "./ProfileStrengthCard";
import { SaveBar } from "./SaveBar";
import { sameValues, toFormValues, toProfileBody, validateProfile } from "./profileForm";

interface Props {
  profile: ProviderProfile;
}

export function ProfileEditor({ profile }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const save = useSaveProfile();
  const initial = useMemo(() => toFormValues(profile), [profile]);
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const dirty = !sameValues(values, initial);

  const change = (patch: Partial<ProfileFormValues>): void => {
    setValues((v) => ({ ...v, ...patch }));
    const cleared = Object.fromEntries(Object.keys(patch).map((k) => [k, null]));
    // Either channel switch fixes the "keep one way to reach you" error.
    if ("acceptsWhatsapp" in patch) cleared.acceptsCalls = null;
    setErrors((e) => ({ ...e, ...cleared }));
  };

  const submit = (): void => {
    const found = validateProfile(values);
    setErrors(found);
    if (!isValid(found)) {
      toast("Please fix the highlighted fields", "error");
      return;
    }
    save.mutate(toProfileBody(values), {
      onSuccess: (saved: ProviderProfile) => {
        setValues(toFormValues(saved));
        toast("Profile updated", "success");
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length)
          setErrors(error.fieldErrors as ProfileFormErrors);
        toast(errorMessage(error), "error");
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}
      >
        <ProfileStrengthCard pct={profile.profileCompletenessPct} checklist={profile.checklist} />
        <ProfileAboutSection values={values} errors={errors} onChange={change} />
        <ProfileContactSection values={values} errors={errors} onChange={change} />
        <ProfileBrandingSection values={values} onChange={change} />
        <ProfileLocationSection
          values={values}
          errors={errors}
          serviceRadiusKm={profile.serviceRadiusKm}
          onChange={change}
        />
      </ScrollView>
      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={submit}
        onDiscard={() => {
          setValues(initial);
          setErrors({});
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
