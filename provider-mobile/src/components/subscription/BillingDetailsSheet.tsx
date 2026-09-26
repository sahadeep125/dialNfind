import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppButton, AppCallout, AppInput, AppSheet, AppText } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { BILLING_KEY } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, api, errorMessage } from "@/services/api";
import type { BillingProfile } from "@/types/billing";
import { GST_STATES, validateGstin } from "@/utils/gst";
import { isValid } from "@/utils/validation";

interface Props {
  visible: boolean;
  profile: BillingProfile;
  onClose: () => void;
}

const STATE_OPTIONS = GST_STATES.map((s) => ({ value: s.code, label: s.name }));

/** Name, address, state and GSTIN printed on the business's GST invoices. */
export function BillingDetailsSheet({ visible, profile, onClose }: Props) {
  // Each opening starts from the saved details.
  const [opened, setOpened] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setOpened((n) => n + 1);
  }
  return (
    <AppSheet visible={visible} onClose={onClose} title="Billing details">
      <BillingForm key={opened} profile={profile} onClose={onClose} />
    </AppSheet>
  );
}

function BillingForm({ profile, onClose }: { profile: BillingProfile; onClose: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(profile.billingName ?? "");
  const [address, setAddress] = useState(profile.billingAddress ?? "");
  const [state, setState] = useState<string | null>(profile.billingStateCode);
  const [gstin, setGstin] = useState(profile.gstin ?? "");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const save = useMutation({
    mutationFn: () =>
      api("/provider/billing/profile", {
        method: "PUT",
        body: { billingName: name.trim(), billingAddress: address.trim(), billingStateCode: state, gstin: gstin.trim().toUpperCase() || null },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BILLING_KEY });
      toast("Billing details saved. New invoices use them.", "success");
      onClose();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors((cur) => ({ ...cur, ...e.fieldErrors }));
    },
  });

  const submit = (): void => {
    const found = {
      billingName: name.trim().length < 2 ? "Enter the name for invoices" : null,
      billingAddress: address.trim().length < 5 ? "Enter the billing address" : null,
      billingStateCode: state ? null : "Choose a state",
      gstin: validateGstin(gstin, state),
    };
    setErrors(found);
    if (isValid(found)) save.mutate();
  };
  const clear = (key: string) => setErrors((e) => ({ ...e, [key]: null }));

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
      <AppText tone="secondary">Printed on your GST invoices for plans and promotions paid online. Add a GSTIN to claim input tax credit.</AppText>
      {save.isError && !(save.error instanceof ApiError && Object.keys(save.error.fieldErrors).length) ? (
        <AppCallout tone="danger">{errorMessage(save.error)}</AppCallout>
      ) : null}
      <AppInput label="Name on invoice" required value={name} onChangeText={(v) => (setName(v), clear("billingName"))} error={errors.billingName} maxLength={150} />
      <AppInput
        label="Billing address"
        required
        value={address}
        onChangeText={(v) => (setAddress(v), clear("billingAddress"))}
        error={errors.billingAddress}
        multiline
        numberOfLines={2}
        maxLength={300}
        textAlignVertical="top"
      />
      <AppSelect
        label="State"
        required
        placeholder="Choose a state"
        options={STATE_OPTIONS}
        value={state}
        onChange={(v) => (setState(v), clear("billingStateCode"), clear("gstin"))}
        error={errors.billingStateCode}
      />
      <AppInput
        label="GSTIN (optional)"
        helper="15 characters, e.g. 19ABCDE1234F1Z5"
        value={gstin}
        onChangeText={(v) => (setGstin(v.toUpperCase()), clear("gstin"))}
        error={errors.gstin}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={15}
      />
      <View>
        <AppButton fullWidth loading={save.isPending} onPress={submit}>
          Save billing details
        </AppButton>
      </View>
    </ScrollView>
  );
}
