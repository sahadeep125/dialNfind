import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";

import { AppButton, AppCallout, AppCard } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { BusinessStep } from "@/components/onboarding/BusinessStep";
import { ContactStep } from "@/components/onboarding/ContactStep";
import { HoursStep } from "@/components/onboarding/HoursStep";
import { LocationStep } from "@/components/onboarding/LocationStep";
import { ServicesStep } from "@/components/onboarding/ServicesStep";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useCreateListing } from "@/hooks/useOnboarding";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { STORAGE_KEYS, readJson, storage, writeJson } from "@/services/storage";
import { useAuthStore } from "@/stores/useAuthStore";
import type { OnboardingDraft, StepErrors } from "@/types/onboarding";
import { ONBOARDING_STEPS, initialDraft, validateStep } from "@/utils/onboarding";

/** Five-step wizard that creates a new listing, like the provider website's setup page. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const toast = useToast();
  const session = useSession();
  const user = useAuthStore((s) => s.user);
  const { applyToken } = useAuthActions();
  const createListing = useCreateListing();
  const scrollRef = useRef<ScrollView>(null);

  // Unfinished setup is kept on the device, so closing the app does not lose it.
  const draftKey = `${STORAGE_KEYS.onboardingDraft}.${user?.id ?? "anon"}`;
  const [saved] = useState(() => readJson<{ step: number; draft: OnboardingDraft }>(draftKey));
  const [step, setStep] = useState(saved?.step ?? 0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => saved?.draft ?? initialDraft(user));
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => writeJson(draftKey, { step, draft }), 400);
    return () => clearTimeout(timer);
  }, [draftKey, step, draft]);

  if (session.data?.state.provider && !createListing.isPending && !createListing.isSuccess)
    return <Redirect href="/" />;

  const isLast = step === ONBOARDING_STEPS.length - 1;

  /** Applies a change and, once errors are showing, re-checks the step so they clear as fixed. */
  const update = (next: OnboardingDraft): void => {
    setDraft(next);
    if (Object.keys(errors).length) setErrors(validateStep(step, next));
  };

  const goTo = (index: number): void => {
    setErrors({});
    setFormError(null);
    setStep(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const submit = (): void => {
    setFormError(null);
    createListing.mutate(draft, {
      onSuccess: async (res) => {
        storage.remove(draftKey);
        await applyToken(res.token);
        if (!res.imagesSaved)
          toast("Your listing is live. Add your logo and cover again from your profile.", "info");
        else toast("Your business is live on DialNFind", "success");
        router.replace("/");
      },
      onError: (error: Error) => {
        setFormError(errorMessage(error));
        toast(errorMessage(error), "error");
      },
    });
  };

  const next = (): void => {
    const problems = validateStep(step, draft);
    setErrors(problems);
    if (Object.keys(problems).length) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (isLast) submit();
    else goTo(step + 1);
  };

  const back = (): void => {
    if (step > 0) goTo(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace("/start");
  };

  const { business, services, location, contact } = draft;
  const summary = [
    business.businessName.trim() || "Your business",
    `${services.length} ${services.length === 1 ? "service" : "services"}`,
    `${location.locality.trim() ? `${location.locality.trim()}, ` : ""}${location.city}`,
    `${location.serviceRadiusKm} km radius`,
  ].join(" · ");

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Set up your business"
        subtitle="You can change everything later"
        showBack={false}
      />
      <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
        <StepIndicator steps={ONBOARDING_STEPS} current={step} onJump={goTo} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing[4], paddingTop: theme.spacing[2] }}
        >
          <AppCard padding={theme.spacing[4]}>
            {step === 0 ? (
              <BusinessStep
                value={business}
                errors={errors}
                onChange={(patch) => update({ ...draft, business: { ...business, ...patch } })}
              />
            ) : null}
            {step === 1 ? (
              <ServicesStep
                value={services}
                errors={errors}
                onChange={(list) => update({ ...draft, services: list })}
              />
            ) : null}
            {step === 2 ? (
              <LocationStep
                value={location}
                areas={draft.areas}
                errors={errors}
                onChange={(patch) => update({ ...draft, location: { ...location, ...patch } })}
                onAreasChange={(areas) => update({ ...draft, areas })}
              />
            ) : null}
            {step === 3 ? (
              <HoursStep
                value={draft.hours}
                errors={errors}
                onChange={(hours) => update({ ...draft, hours })}
              />
            ) : null}
            {step === 4 ? (
              <ContactStep
                value={contact}
                errors={errors}
                summary={summary}
                onChange={(patch) => update({ ...draft, contact: { ...contact, ...patch } })}
              />
            ) : null}
          </AppCard>
          {formError ? (
            <View style={{ marginTop: theme.spacing[4] }}>
              <AppCallout tone="danger" title="Could not publish your listing">
                {formError}
              </AppCallout>
            </View>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              gap: theme.spacing[3],
              padding: theme.spacing[4],
              borderTopColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.primary,
            },
          ]}
        >
          <AppButton
            variant="ghost"
            onPress={back}
            disabled={createListing.isPending}
            leadingIcon={<ArrowLeft size={18} color={theme.colors.text.primary} />}
          >
            Back
          </AppButton>
          <AppButton
            size="lg"
            style={styles.flex}
            loading={createListing.isPending}
            onPress={next}
            trailingIcon={
              isLast ? undefined : (
                <ArrowRight size={18} color={theme.components.button.primary.text} />
              )
            }
          >
            {isLast ? "Publish my listing" : "Continue"}
          </AppButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { alignItems: "center", borderTopWidth: 1, flexDirection: "row" },
});
