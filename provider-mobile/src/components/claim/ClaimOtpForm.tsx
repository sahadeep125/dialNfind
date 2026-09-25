import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton, AppInput, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ClaimListing } from "@/types/onboarding";
import { ListingRow } from "./ListingRow";

interface Props {
  listing: ClaimListing;
  sentTo: string;
  devCode?: string;
  loading: boolean;
  onVerify: (code: string) => void;
}

/** The 6-digit code step of a phone claim. */
export function ClaimOtpForm({ listing, sentTo, devCode, loading, onVerify }: Props) {
  const theme = useTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code");
      return;
    }
    setError(null);
    onVerify(code);
  };

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <ListingRow listing={listing} />
      <AppInput
        label={`Enter the code sent to ${sentTo}`}
        value={code}
        onChangeText={(v) => {
          setCode(v.replace(/\D/g, "").slice(0, 6));
          if (error) setError(null);
        }}
        error={error}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        placeholder="6-digit code"
        maxLength={6}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.code, { fontFamily: theme.typography.heading.fontFamily }]}
      />
      {devCode ? (
        <AppText variant="caption" tone="tertiary">
          {`Development mode: SMS is not connected yet, use code ${devCode}.`}
        </AppText>
      ) : null}
      <AppButton size="lg" fullWidth loading={loading} onPress={submit}>
        Verify and claim
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 22, letterSpacing: 8, textAlign: "center" },
});
