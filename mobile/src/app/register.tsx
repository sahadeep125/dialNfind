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
import { Mail, Phone, UserRound } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppPressable, AppText } from "@/components/design-system";
import { PasswordInput, SocialSignInButtons } from "@/components/auth";
import { Screen, ScreenHeader } from "@/components/layout";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import type { SessionUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";
import {
  isValid,
  validateEmail,
  validateName,
  validateOptionalPhone,
  validatePassword,
} from "@/utils/validation";

type Field = "name" | "email" | "phone" | "password";

export default function RegisterScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { register } = useAuthActions();
  const { data: config } = useAppConfig();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  };

  const openLegal = async (url: string | null | undefined): Promise<void> => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (error: unknown) {
      toast(`Could not open the page. ${errorMessage(error)}`, "error");
    }
  };

  const submit = (): void => {
    const next = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      phone: validateOptionalPhone(values.phone),
      password: validatePassword(values.password),
    };
    setErrors(next);
    setFormError(null);
    if (!isValid(next)) return;
    register.mutate(values, {
      onSuccess: ({ user }) => {
        toast(`Welcome to DialNFind, ${user.name.split(" ")[0]}`, "success");
        if (router.canGoBack()) router.back();
        else router.replace("/");
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length)
          setErrors(error.fieldErrors);
        setFormError(errorMessage(error));
      },
    });
  };

  const onSocialSignedIn = ({ user, isNewUser }: { user: SessionUser; isNewUser: boolean }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { padding: theme.spacing[6], gap: theme.spacing[4] },
          ]}
        >
          <View style={{ gap: theme.spacing[2] }}>
            <AppText variant="title" accessibilityRole="header">
              Create your account
            </AppText>
            <AppText tone="secondary">
              Save providers you like and share reviews with your neighbours.
            </AppText>
          </View>

          {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

          <SocialSignInButtons mode="signup" onError={setFormError} onSignedIn={onSocialSignedIn} />

          <AppInput
            label="Full name"
            required
            value={values.name}
            onChangeText={set("name")}
            error={errors.name}
            placeholder="Your name"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            leadingIcon={<UserRound size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            ref={emailRef}
            label="Email"
            required
            value={values.email}
            onChangeText={set("email")}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
          />
          <AppInput
            ref={phoneRef}
            label="Mobile number"
            helper="Optional. 10-digit Indian number."
            value={values.phone}
            onChangeText={set("phone")}
            error={errors.phone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            leadingIcon={<Phone size={18} color={theme.colors.text.tertiary} />}
          />
          <PasswordInput
            ref={passwordRef}
            label="Password"
            required
            helper="At least 8 characters with a letter and a number."
            value={values.password}
            onChangeText={set("password")}
            error={errors.password}
            placeholder="Create a password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <AppText variant="caption" tone="secondary">
            By creating an account you agree to the{" "}
            <AppText
              variant="caption"
              tone="brand"
              onPress={config?.terms_url ? () => void openLegal(config.terms_url) : undefined}
            >
              Terms of service
            </AppText>{" "}
            and{" "}
            <AppText
              variant="caption"
              tone="brand"
              onPress={config?.privacy_url ? () => void openLegal(config.privacy_url) : undefined}
            >
              Privacy policy
            </AppText>
            .
          </AppText>

          <AppButton size="lg" fullWidth loading={register.isPending} onPress={submit}>
            Create account
          </AppButton>

          <View style={styles.switchRow}>
            <AppText tone="secondary">Already have an account?</AppText>
            <AppPressable
              accessibilityRole="link"
              hitSlop={10}
              onPress={() => router.replace("/login")}
            >
              <AppText variant="label" tone="brand">
                Sign in
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
  content: { flexGrow: 1, maxWidth: 480, width: "100%", alignSelf: "center" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
