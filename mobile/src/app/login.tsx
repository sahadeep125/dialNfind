import { useRef, useState } from "react";
import { StyleSheet, type TextInput } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppPressable, AppText } from "@/components/design-system";
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
import { errorMessage } from "@/services/api";
import { isValid, validateEmail } from "@/utils/validation";

export default function LoginScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { login } = useAuthActions();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const close = (): void => (router.canGoBack() ? router.back() : router.replace("/"));

  const onSocialSignedIn = ({
    user,
    isNewUser,
  }: {
    user: SessionUser;
    isNewUser: boolean;
  }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    close();
  };

  const submit = (): void => {
    const next = { email: validateEmail(email), password: password ? null : "Enter your password" };
    setErrors(next);
    setFormError(null);
    if (!isValid(next)) return;
    login.mutate(
      { email, password },
      {
        onSuccess: ({ user }) => {
          if (!user.emailVerifiedAt) {
            router.replace("/verify-email");
            return;
          }
          toast(`Welcome back, ${user.name.split(" ")[0]}`, "success");
          close();
        },
        onError: (error: Error) => setFormError(errorMessage(error)),
      },
    );
  };

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Sign in to save favorites and review providers."
      footer={
        <>
          <AuthSwitch
            prompt="New to DialNFind?"
            action="Create an account"
            onPress={() => router.replace("/register")}
          />
          <LegalNote lead="By continuing" />
        </>
      }
    >
      {formError ? <AppCallout tone="danger">{formError}</AppCallout> : null}

      <AppInput
        label="Email"
        value={email}
        onChangeText={(v) => (setEmail(v), setErrors((e) => ({ ...e, email: null })))}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        leadingIcon={<Mail size={18} color={theme.colors.text.tertiary} />}
      />
      <PasswordInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={(v) => (setPassword(v), setErrors((e) => ({ ...e, password: null })))}
        error={errors.password}
        placeholder="Your password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <AppPressable
        accessibilityRole="link"
        hitSlop={10}
        style={styles.forgot}
        onPress={() => router.push("/forgot-password")}
      >
        <AppText variant="labelSmall" tone="brand">
          Forgot password?
        </AppText>
      </AppPressable>

      <AppButton
        size="md"
        fullWidth
        loading={login.isPending}
        onPress={submit}
        style={{ marginTop: theme.spacing[1] }}
      >
        Sign in
      </AppButton>

      <SocialSignInButtons mode="signin" onError={setFormError} onSignedIn={onSocialSignedIn} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: "flex-end" },
});
