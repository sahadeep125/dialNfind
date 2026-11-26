import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";

import { AppButton, AppCallout } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { AccountTypeStep } from "@/components/onboarding/AccountTypeStep";
import { BusinessStep } from "@/components/onboarding/BusinessStep";
import { ContactStep } from "@/components/onboarding/ContactStep";
import { HoursStep } from "@/components/onboarding/HoursStep";
import { LocationStep } from "@/components/onboarding/LocationStep";
import { ServicesStep } from "@/components/onboarding/ServicesStep";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useProfessions, useSwitchListing } from "@/hooks/useListings";
import { useCreateListing } from "@/hooks/useOnboarding";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { track } from "@/services/analytics";
import { errorMessage } from "@/services/api";
import { STORAGE_KEYS, readJson, storage, writeJson } from "@/services/storage";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Profession } from "@/types";
import type { BusinessType, OnboardingDraft, StepErrors } from "@/types/onboarding";
import { professionKey } from "@/utils/accountType";
import {
  initialDraft,
  servicesForProfession,
  servicesForType,
  stepsFor,
  validateStep,
} from "@/utils/onboarding";

/** A draft saved by an older version of the app, before the account type step: fill in the new fields. */
function upgrade(saved: { step: number; draft: OnboardingDraft } | null, fresh: OnboardingDraft) {
  if (!saved) return null;
  const business: Partial<OnboardingDraft["business"]> = saved.draft.business;
  if (business.professionKey !== undefined) return saved;
  return { step: 0, draft: { ...saved.draft, business: { ...fresh.business, ...business } } };
}

/**
 * The wizard that creates a listing, like the provider website's setup page. A first listing starts
 * with the account type; `?add=1` adds another profession for an individual who is already listed.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const toast = useToast();
  const session = useSession();
  const user = useAuthStore((s) => s.user);
  const { applyToken } = useAuthActions();
  const createListing = useCreateListing();
  const switchListing = useSwitchListing();
  const professions = useProfessions();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ add?: string }>();
  const state = session.data?.state;
  // An individual professional adding another profession: a new listing under the same account.
  const adding = params.add === "1" && !!state?.provider && state.accountType === "individual";
  const current0 = useProfile();
  const steps = stepsFor(adding);

  // Unfinished setup is kept on the device, so closing the app does not lose it.
  const draftKey = `${STORAGE_KEYS.onboardingDraft}.${user?.id ?? "anon"}${adding ? ".add" : ""}`;
  const [saved] = useState(() =>
    upgrade(readJson<{ step: number; draft: OnboardingDraft }>(draftKey), initialDraft(user)),
  );
  const [step, setStep] = useState(saved?.step ?? 0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => saved?.draft ?? initialDraft(user));
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const prefilled = useRef(!!saved);

  useEffect(() => {
    const timer = setTimeout(() => writeJson(draftKey, { step, draft }), 400);
    return () => clearTimeout(timer);
  }, [draftKey, step, draft]);

  // A new profession starts from the current listing's name, location, hours and contact details.
  const currentListing = current0.data;
  useEffect(() => {
    if (!adding || prefilled.current || !currentListing) return;
    prefilled.current = true;
    const p = currentListing;
    setDraft((d) => ({
      ...d,
      business: { ...d.business, businessName: p.businessName, businessType: "individual" },
      location: {
        addressLine: p.addressLine ?? "",
        locality: p.locality ?? "",
        city: p.city,
        state: p.state,
        pincode: p.pincode ?? "",
        latitude: p.latitude,
        longitude: p.longitude,
        serviceRadiusKm: p.serviceRadiusKm,
      },
      areas: p.serviceAreas,
      hours: p.businessHours.length ? p.businessHours : d.hours,
      contact: {
        phone: p.phone,
        whatsappNumber: p.whatsappNumber ?? "",
        email: p.email ?? "",
        website: p.website ?? "",
        acceptsCalls: p.acceptsCalls,
        acceptsWhatsapp: p.acceptsWhatsapp,
      },
    }));
  }, [adding, currentListing]);

  if (state?.provider && !adding && !createListing.isPending && !createListing.isSuccess)
    return <Redirect href="/" />;

  const name = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;
  const { business, services, location, contact } = draft;
  const individual = business.businessType === "individual";
  const picked = (professions.data ?? []).find((p) => professionKey(p) === business.professionKey) ?? null;
  const taken = adding
    ? (state?.listings ?? []).map((l) => l.professionLabel?.toLowerCase() ?? "").filter(Boolean)
    : [];

  /** Applies a change and, once errors are showing, re-checks the step so they clear as fixed. */
  const update = (next: OnboardingDraft): void => {
    setDraft(next);
    if (Object.keys(errors).length) setErrors(validateStep(name, next));
  };

  /** Picking a profession sets the listing's main service; the Services step adds more from that category. */
  const pickProfession = (p: Profession): void =>
    update({
      ...draft,
      business: { ...business, professionKey: professionKey(p) },
      services: servicesForProfession(services, p),
    });

  const pickType = (t: BusinessType): void =>
    update({
      ...draft,
      business: { ...business, businessType: t },
      services: servicesForType(services, t, picked?.categoryId ?? null),
    });

  const goTo = (index: number): void => {
    if (index > step) {
      track("onboarding_step_completed", { step: step + 1, step_name: name, total_steps: steps.length });
    }
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
        // Work on the new listing straight away (the API picks the first one otherwise).
        if (adding) await switchListing(res.provider.id);
        await applyToken(res.token);
        if (!res.imagesSaved)
          toast("Your listing is live. Add your photos again from your profile.", "info");
        else
          toast(
            adding
              ? "Your new profession is listed"
              : individual
                ? "You are listed on KaajVa"
                : "Your business is listed on KaajVa",
            "success",
          );
        router.replace("/");
      },
      onError: (error: Error) => {
        setFormError(errorMessage(error));
        toast(errorMessage(error), "error");
      },
    });
  };

  const next = (): void => {
    const problems = validateStep(name, draft);
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

  const summary = [
    [
      business.businessName.trim() || (individual ? "You" : "Your business"),
      individual ? business.profession.trim() || picked?.label : null,
      location.locality.trim() || location.city,
    ]
      .filter(Boolean)
      .join(" – "),
    `${services.length} ${services.length === 1 ? "service" : "services"}`,
    `${location.serviceRadiusKm} km radius`,
  ].join(" · ");

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title={adding ? "Add another profession" : "Create your listing"}
        subtitle={
          adding
            ? "Each profession gets its own listing under your name"
            : "You can change everything later"
        }
        showBack={false}
      />
      <View
        style={{ paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing[3] }}
      >
        <StepIndicator steps={steps} current={step} onJump={goTo} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[8],
          }}
        >
          <View>
            {name === "Account type" ? (
              <AccountTypeStep value={business.businessType} onChange={pickType} />
            ) : null}
            {name === "About" ? (
              <BusinessStep
                value={business}
                errors={errors}
                onChange={(patch) => update({ ...draft, business: { ...business, ...patch } })}
                onPickProfession={pickProfession}
                pickedLabel={picked?.label ?? null}
                taken={taken}
                nameLocked={adding}
              />
            ) : null}
            {name === "Services" ? (
              <ServicesStep
                value={services}
                errors={errors}
                onChange={(list) => update({ ...draft, services: list })}
                lockCategoryId={individual ? (picked?.categoryId ?? null) : null}
                title={
                  individual
                    ? `Your services as ${business.profession.trim() || picked?.label || "a professional"}`
                    : undefined
                }
              />
            ) : null}
            {name === "Location" ? (
              <LocationStep
                value={location}
                areas={draft.areas}
                errors={errors}
                onChange={(patch) => update({ ...draft, location: { ...location, ...patch } })}
                onAreasChange={(areas) => update({ ...draft, areas })}
              />
            ) : null}
            {name === "Hours" ? (
              <HoursStep
                value={draft.hours}
                errors={errors}
                onChange={(hours) => update({ ...draft, hours })}
              />
            ) : null}
            {name === "Contact" ? (
              <ContactStep
                value={contact}
                errors={errors}
                summary={summary}
                onChange={(patch) => update({ ...draft, contact: { ...contact, ...patch } })}
              />
            ) : null}
          </View>
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
              gap: theme.spacing[2],
              paddingHorizontal: theme.layout.screenPadding,
              paddingVertical: theme.spacing[3],
              borderTopColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.elevated,
            },
          ]}
        >
          <AppButton
            variant="ghost"
            onPress={back}
            disabled={createListing.isPending}
            leadingIcon={<ArrowLeft size={16} color={theme.colors.text.primary} />}
          >
            Back
          </AppButton>
          <AppButton
            style={styles.flex}
            loading={createListing.isPending}
            onPress={next}
            trailingIcon={
              isLast ? undefined : (
                <ArrowRight size={16} color={theme.components.button.primary.text} />
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
  footer: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row" },
});
