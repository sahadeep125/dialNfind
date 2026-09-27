import { useRef, useState } from "react";
import type { TextInput } from "react-native";
import { router } from "expo-router";
import { Mail, Phone, UserRound } from "lucide-react-native";

import { AppButton, AppCallout, AppInput } from "@/components/design-system";
import {
  AuthScaffold,
  AuthSwitch,
  LegalNote,
  PasswordInput,
  SocialSignInButtons,
} from "@/components/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import type { SessionUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
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
        if (!user.emailVerifiedAt) {
          router.replace({ pathname: "/verify-email", params: { sent: "1" } });
          return;
        }
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

  const onSocialSignedIn = ({
    user,
    isNewUser,
  }: {
    user: SessionUser;
    isNewUser: boolean;
  }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <AuthScaffold
      title="Create your account"
      subtitle="Save providers you like and share reviews."
      footer={
        <>
          <AuthSwitch
            prompt="Already have an account?"
            action="Sign in"
            onPress={() => router.replace("/login")}
          />
          <LegalNote lead="By creating an account" />
        </>
      }
    >
      {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

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
        label="Mobile number (optional)"
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
        helper="8+ characters with a letter and a number."
        value={values.password}
        onChangeText={set("password")}
        error={errors.password}
        placeholder="Create a password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <AppButton
        size="md"
        fullWidth
        loading={register.isPending}
        onPress={submit}
        style={{ marginTop: theme.spacing[1] }}
      >
        Create account
      </AppButton>

      <SocialSignInButtons mode="signup" onError={setFormError} onSignedIn={onSocialSignedIn} />
    </AuthScaffold>
  );
}
