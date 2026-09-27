import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppPressable, AppText } from "@/components/design-system";
import { AuthLayout, SocialSignInButtons } from "@/components/auth";
import { PasswordInput } from "@/components/forms";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import type { SessionUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { isValid, validateEmail } from "@/utils/validation";

/** Sign in to a DialNFind business account. */
export default function LoginScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { login } = useAuthActions();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

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
          router.replace("/");
        },
        onError: (error: Error) => setFormError(errorMessage(error)),
      },
    );
  };

  // The home screen sends new business accounts through setup.
  const onSocialSignedIn = ({
    user,
    isNewUser,
  }: {
    user: SessionUser;
    isNewUser: boolean;
  }): void => {
    const first = user.name.split(" ")[0];
    toast(isNewUser ? `Welcome to DialNFind, ${first}` : `Welcome back, ${first}`, "success");
    router.replace("/");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your leads, reviews and listing."
      footer={
        <View style={styles.switchRow}>
          <AppText variant="meta" tone="secondary">
            New to DialNFind?
          </AppText>
          <AppPressable
            accessibilityRole="link"
            hitSlop={10}
            onPress={() => router.replace("/register")}
          >
            <AppText
              variant="caption"
              tone="brand"
              style={{ fontFamily: theme.typography.label.fontFamily }}
            >
              Create a business account
            </AppText>
          </AppPressable>
        </View>
      }
    >
      {formError ? <AppCallout tone="danger" title={formError} /> : null}

      <AppInput
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErrors((e) => ({ ...e, email: null }));
        }}
        error={errors.email}
        placeholder="you@business.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        leadingIcon={<Mail size={16} color={theme.colors.text.tertiary} />}
      />
      <View style={{ gap: theme.spacing[2] }}>
        <PasswordInput
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrors((e) => ({ ...e, password: null }));
          }}
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
          <AppText
            variant="caption"
            tone="brand"
            style={{ fontFamily: theme.typography.label.fontFamily }}
          >
            Forgot password?
          </AppText>
        </AppPressable>
      </View>

      <AppButton
        size="lg"
        fullWidth
        loading={login.isPending}
        onPress={submit}
        style={{ marginTop: theme.spacing[1] }}
      >
        Log in
      </AppButton>

      <SocialSignInButtons
        mode="signin"
        placement="bottom"
        onError={setFormError}
        onSignedIn={onSocialSignedIn}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: "flex-end" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
