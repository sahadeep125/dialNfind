import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";

import { AppButton, AppInput, AppSheet, AppText } from "@/components/design-system";
import { PasswordInput } from "@/components/forms";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Null for an account that never added or claimed a business. */
  businessName: string | null;
  /** False for Google/Apple-only accounts, who type DELETE instead. */
  hasPassword: boolean;
}

/** Permanently deletes the business account after the person confirms with their password (or DELETE). */
export function DeleteAccountSheet({ visible, onClose, businessName, hasPassword }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const { deleteAccount } = useAuthActions();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setValue("");
    setError(null);
    onClose();
  };

  const submit = (): void => {
    if (hasPassword ? !value : value.trim().toUpperCase() !== "DELETE") {
      setError(hasPassword ? "Enter your password" : "Type DELETE to confirm");
      return;
    }
    deleteAccount.mutate(hasPassword ? { password: value } : { confirm: value.trim() }, {
      onSuccess: () => {
        close();
        router.replace("/login");
        toast("Your account has been deleted", "success");
      },
      onError: (err: Error) => setError(err instanceof ApiError ? (err.fieldErrors.password ?? err.fieldErrors.confirm ?? err.message) : errorMessage(err)),
    });
  };

  return (
    <AppSheet visible={visible} onClose={close} title="Delete your account?">
      <View style={{ gap: theme.spacing[4], paddingHorizontal: theme.spacing[4] }}>
        <AppText tone="secondary">
          {businessName
            ? `${businessName} will be removed from KaajVa search straight away. Your sign-in details are erased. This cannot be undone.`
            : "Your account and sign-in details are erased. This cannot be undone."}
        </AppText>
        {hasPassword ? (
          <PasswordInput
            label="Enter your password to confirm"
            value={value}
            onChangeText={(t: string) => (setValue(t), setError(null))}
            error={error}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        ) : (
          <AppInput
            label="Type DELETE to confirm"
            value={value}
            onChangeText={(t: string) => (setValue(t), setError(null))}
            error={error}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        )}
        <AppButton
          variant="destructive"
          fullWidth
          loading={deleteAccount.isPending}
          leadingIcon={<Trash2 size={16} color={theme.colors.semantic.danger} />}
          onPress={submit}
        >
          Delete permanently
        </AppButton>
        <View style={styles.row}>
          <AppButton variant="secondary" style={styles.flex} onPress={close}>
            Keep my account
          </AppButton>
        </View>
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  flex: { flex: 1 },
});
