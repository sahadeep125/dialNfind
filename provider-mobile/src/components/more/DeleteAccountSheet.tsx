import { useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
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
  businessName: string;
  /** False for Google/Apple-only accounts, who type DELETE instead. */
  hasPassword: boolean;
}

const STORE_MANAGE = {
  app_store: { name: "the App Store", url: "https://apps.apple.com/account/subscriptions" },
  play_store: { name: "Google Play", url: "https://play.google.com/store/account/subscriptions" },
} as const;

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
      onSuccess: ({ storeSubscription }) => {
        close();
        router.replace("/login");
        if (storeSubscription) {
          const store = STORE_MANAGE[storeSubscription];
          Alert.alert(
            "Cancel your store subscription",
            `Your account is deleted. Your plan was bought in ${store.name}, which keeps billing until you cancel it there.`,
            [
              { text: "Later", style: "cancel" },
              { text: "Manage subscription", onPress: () => void Linking.openURL(store.url) },
            ],
          );
        } else {
          toast("Your account has been deleted", "success");
        }
      },
      onError: (err: Error) => setError(err instanceof ApiError ? (err.fieldErrors.password ?? err.fieldErrors.confirm ?? err.message) : errorMessage(err)),
    });
  };

  return (
    <AppSheet visible={visible} onClose={close} title="Delete your account?">
      <View style={{ gap: theme.spacing[4], paddingHorizontal: theme.spacing[4] }}>
        <AppText tone="secondary">
          {`${businessName} will be removed from DialNFind search straight away, your plan will stop renewing and running promotions will end. Your sign-in details are erased. This cannot be undone.`}
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
