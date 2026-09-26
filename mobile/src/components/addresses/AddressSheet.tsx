import { useState } from "react";
import { ScrollView, View } from "react-native";
import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";

import { AppButton, AppCallout, AppInput, AppSheet, AppText } from "@/components/design-system";
import { useSaveAddress } from "@/hooks/useAddresses";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { getCurrentLocation } from "@/services/location";
import type { Address } from "@/types";
import { validatePincode } from "@/utils/addresses";
import { isValid } from "@/utils/validation";

interface Props {
  visible: boolean;
  /** The address to edit, or null to add a new one. */
  address: Address | null;
  onClose: () => void;
}

const EMPTY = { label: "", addressLine: "", city: "", state: "", pincode: "" };

/** Add or edit a saved address. The map position comes from the device location or from the address itself. */
export function AddressSheet({ visible, address, onClose }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const save = useSaveAddress();
  // The screen remounts this sheet (via key) each time it opens, so state starts from the address.
  const [values, setValues] = useState(() =>
    address ? { label: address.label, addressLine: address.addressLine, city: address.city, state: address.state, pincode: address.pincode } : EMPTY,
  );
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(() =>
    address?.latitude != null && address.longitude != null ? { latitude: address.latitude, longitude: address.longitude } : null,
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [locating, setLocating] = useState(false);

  const set = (key: keyof typeof EMPTY) => (v: string) => {
    setValues((s) => ({ ...s, [key]: v }));
    setErrors((e) => ({ ...e, [key]: null }));
    // The typed address may no longer match the position found earlier.
    if (key !== "label") setCoords(null);
  };

  const locateHere = async (): Promise<void> => {
    setLocating(true);
    try {
      const here = await getCurrentLocation();
      setCoords({ latitude: here.latitude, longitude: here.longitude });
      setValues((s) => ({ ...s, city: s.city || here.city, state: s.state || here.state }));
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setLocating(false);
    }
  };

  /** Finds the map position of the typed address; saving still works without one. */
  const geocode = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const [hit] = await Location.geocodeAsync(`${values.addressLine}, ${values.city}, ${values.state} ${values.pincode}, India`);
      return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
    } catch (error: unknown) {
      console.error("[addresses] Geocoding failed", error);
      return null;
    }
  };

  const submit = async (): Promise<void> => {
    const found = {
      addressLine: values.addressLine.trim().length < 3 ? "Enter the house, street and landmark" : null,
      city: values.city.trim().length < 2 ? "Enter your city" : null,
      state: values.state.trim().length < 2 ? "Enter your state" : null,
      pincode: validatePincode(values.pincode),
    };
    setErrors(found);
    if (!isValid(found)) return;
    const position = coords ?? (await geocode());
    save.mutate(
      { id: address?.id, input: { ...values, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null } },
      {
        onSuccess: () => {
          toast(address ? "Address updated" : "Address saved", "success");
          onClose();
        },
        onError: (error: Error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
        },
      },
    );
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title={address ? "Edit address" : "Add an address"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing[4], paddingBottom: theme.spacing[4] }}>
        {save.isError ? <AppCallout tone="danger">{errorMessage(save.error)}</AppCallout> : null}
        <AppInput label="Label" placeholder="Home, Work, Mum's place" value={values.label} onChangeText={set("label")} maxLength={30} />
        <AppInput
          label="Address"
          required
          placeholder="House, street and landmark"
          value={values.addressLine}
          onChangeText={set("addressLine")}
          error={errors.addressLine}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
        />
        <View style={{ flexDirection: "row", gap: theme.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <AppInput label="City" required value={values.city} onChangeText={set("city")} error={errors.city} textContentType="addressCity" />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput label="PIN code" required value={values.pincode} onChangeText={set("pincode")} error={errors.pincode} keyboardType="number-pad" maxLength={6} textContentType="postalCode" />
          </View>
        </View>
        <AppInput label="State" required value={values.state} onChangeText={set("state")} error={errors.state} textContentType="addressState" />
        <AppButton
          variant="soft"
          loading={locating}
          onPress={() => void locateHere()}
          leadingIcon={<Crosshair size={18} color={theme.colors.brand.softText} />}
        >
          {coords ? "Location set. Use my current location again" : "I'm here now: use my location"}
        </AppButton>
        <AppText variant="caption" tone="tertiary">
          The location lets you search around this address. Without it we look it up from what you typed.
        </AppText>
        <AppButton size="lg" fullWidth loading={save.isPending} onPress={() => void submit()}>
          {address ? "Save changes" : "Save address"}
        </AppButton>
      </ScrollView>
    </AppSheet>
  );
}
