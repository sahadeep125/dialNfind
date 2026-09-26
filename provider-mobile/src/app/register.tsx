import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from "react-native";
import { router } from "expo-router";
import { Check, Mail, Phone, User } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppPressable, AppText } from "@/components/design-system";
import { SocialSignInButtons } from "@/components/auth";
import { PasswordInput } from "@/components/forms";
import { BrandMark, Screen } from "@/components/layout";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import type { SessionUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl, openWebPage } from "@/services/links";
import {
  isValid,
  validateEmail,
  validateName,
  validateOptionalPhone,
  validatePassword,
} from "@/utils/validation";

/** Create a DialNFind business account. The listing itself is set up on the next screens. */
export default function RegisterScreen() {
  const theme = useTheme();
  const toast = useToast();
  const config = useAppConfig();
  const { register } = useAuthActions();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  };

  const openTerms = (): void => {
    const url = config.data?.terms_url;
    (url ? openUrl(url) : openWebPage("/terms")).catch((error: unknown) =>
      toast(errorMessage(error), "error"),
    );
  };

  const submit = (): void => {
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      phone: validateOptionalPhone(form.phone),
      password: validatePassword(form.password),
      acceptTerms: acceptTerms ? null : "Accept the terms to continue",
    };
    setErrors(next);
    setFormError(null);
    if (!isValid(next)) return;
    register.mutate(form, {
      onSuccess: ({ user }) => {
        if (!user.emailVerifiedAt) {
          router.replace({ pathname: "/verify-email", params: { sent: "1" } });
          return;
        }
        toast(`Welcome to DialNFind, ${user.name.split(" ")[0]}`, "success");
        router.replace("/");
      },
      onError: (error: Error) => setFormError(errorMessage(error)),
    });
  };

  // The home screen sends new business accounts through setup.
  const onSocialSignedIn = ({ user, isNewUser }: { user: SessionUser; isNewUser: boolean }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    router.replace("/");
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { padding: theme.spacing[6], gap: theme.spacing[5] },
          ]}
        >
          <View style={[styles.brand, { gap: theme.spacing[3] }]}>
            <BrandMark size={56} />
            <AppText variant="overline" tone="brand" align="center">
              DialNFind for Business
            </AppText>
            <AppText variant="title" align="center" accessibilityRole="header">
              Create your business account
            </AppText>
            <AppText tone="secondary" align="center">
              Free to join. Takes about three minutes to get listed.
            </AppText>
          </View>

          {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

          <SocialSignInButtons mode="signup" onError={setFormError} onSignedIn={onSocialSignedIn} />

          <AppInput
            label="Your name"
            required
            value={form.name}
            onChangeText={(v) => set("name", v)}
            error={errors.name}
            placeholder="Full name"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            leadingIcon={<User size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            ref={emailRef}
            label="Email"
            required
            value={form.email}
            onChangeText={(v) => set("email", v)}
            error={errors.email}
            placeholder="you@business.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            ref={phoneRef}
            label="Mobile number"
            helper="Optional. 10-digit Indian mobile number"
            value={form.phone}
            onChangeText={(v) => set("phone", v)}
            error={errors.phone}
            placeholder="98xxx xxxxx"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={16}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            leadingIcon={<Phone size={18} color={theme.colors.text.tertiary} />}
          />
          <PasswordInput
            ref={passwordRef}
            label="Password"
            required
            helper="At least 8 characters with a letter and a number"
            value={form.password}
            onChangeText={(v) => set("password", v)}
            error={errors.password}
            placeholder="Create a password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
          />

          <View style={{ gap: theme.spacing[1] }}>
            <AppPressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptTerms }}
              accessibilityLabel="I agree to the provider terms and consent to my business phone number being shown to customers"
              scale={false}
              onPress={() => {
                setAcceptTerms((v) => !v);
                setErrors((e) => ({ ...e, acceptTerms: null }));
              }}
              style={[styles.terms, { gap: theme.spacing[3] }]}
            >
              <View
                style={[
                  styles.box,
                  {
                    borderRadius: theme.radius.sm / 2,
                    borderColor: errors.acceptTerms
                      ? theme.colors.semantic.danger
                      : acceptTerms
                        ? theme.colors.brand.primary
                        : theme.colors.border.secondary,
                    backgroundColor: acceptTerms
                      ? theme.colors.brand.primary
                      : theme.colors.background.elevated,
                  },
                ]}
              >
                {acceptTerms ? (
                  <Check size={14} color={theme.components.button.primary.text} />
                ) : null}
              </View>
              <AppText variant="caption" tone="secondary" style={styles.flex}>
                I agree to the provider terms and consent to my business phone number being shown to
                customers.
              </AppText>
            </AppPressable>
            {errors.acceptTerms ? (
              <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {errors.acceptTerms}
              </AppText>
            ) : null}
            <AppPressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={openTerms}
              style={styles.termsLink}
            >
              <AppText variant="caption" tone="brand">
                Read the terms
              </AppText>
            </AppPressable>
          </View>

          <AppButton size="lg" fullWidth loading={register.isPending} onPress={submit}>
            Create account
          </AppButton>

          <View style={styles.switchRow}>
            <AppText tone="secondary">Already registered?</AppText>
            <AppPressable
              accessibilityRole="link"
              hitSlop={10}
              onPress={() => router.replace("/login")}
            >
              <AppText variant="label" tone="brand">
                Log in
              </AppText>
            </AppPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
  },
  brand: { alignItems: "center" },
  terms: { alignItems: "flex-start", flexDirection: "row" },
  box: {
    alignItems: "center",
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  termsLink: { alignSelf: "flex-start", marginLeft: 34 },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
