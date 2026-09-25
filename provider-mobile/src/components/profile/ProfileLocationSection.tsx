import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LocateFixed, Navigation } from "lucide-react-native";

import { LocationSearchField } from "@/components/areas/LocationSearchField";
import { AppButton, AppInput, AppListItem, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { getCurrentLocation } from "@/services/location";
import type { LocationOption } from "@/types";
import type { ProfileFormErrors, ProfileFormValues } from "@/types/listing";
import { FormSection } from "./FormSection";

interface Props {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  serviceRadiusKm: number;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}

const round = (n: number): number => Math.round(n * 1e6) / 1e6;

export function ProfileLocationSection({ values, errors, serviceRadiusKm, onChange }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const pick = (l: LocationOption): void =>
    onChange({
      latitude: round(l.latitude),
      longitude: round(l.longitude),
      city: l.city || l.name,
      state: l.state || values.state,
      locality: l.kind === "city" ? values.locality : l.name,
    });

  const locate = async (): Promise<void> => {
    setLocating(true);
    try {
      const here = await getCurrentLocation();
      onChange({
        latitude: round(here.latitude),
        longitude: round(here.longitude),
        city: here.city || values.city,
        state: here.state || values.state,
      });
      toast("Pin moved to where you are now", "success");
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setLocating(false);
    }
  };

  return (
    <FormSection title="Location" description="Your pin decides who sees you in nearby searches.">
      <LocationSearchField label="Find your area" onPick={pick} />
      <View style={[styles.row, { gap: theme.spacing[2] }]}>
        <AppButton
          size="sm"
          variant="secondary"
          loading={locating}
          leadingIcon={<LocateFixed size={16} color={theme.colors.text.primary} />}
          onPress={() => void locate()}
        >
          Use my current location
        </AppButton>
        <AppText variant="caption" tone="tertiary">
          Pin: {values.latitude.toFixed(4)}, {values.longitude.toFixed(4)}
        </AppText>
      </View>
      <AppInput
        label="Street address"
        helper="Optional"
        value={values.addressLine}
        onChangeText={(addressLine) => onChange({ addressLine })}
        error={errors.addressLine}
        placeholder="Shop number, building, street"
        autoComplete="street-address"
        maxLength={200}
      />
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View style={styles.half}>
          <AppInput
            label="Locality"
            value={values.locality}
            onChangeText={(locality) => onChange({ locality })}
            error={errors.locality}
            placeholder="e.g. Sevoke Road"
            maxLength={80}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="City"
            required
            value={values.city}
            onChangeText={(city) => onChange({ city })}
            error={errors.city}
            maxLength={60}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="State"
            required
            value={values.state}
            onChangeText={(state) => onChange({ state })}
            error={errors.state}
            maxLength={60}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="PIN code"
            value={values.pincode}
            onChangeText={(v) => onChange({ pincode: v.replace(/\D/g, "").slice(0, 6) })}
            error={errors.pincode}
            keyboardType="number-pad"
            autoComplete="postal-code"
            placeholder="734001"
            maxLength={6}
          />
        </View>
      </View>
      <View
        style={[
          styles.link,
          { borderRadius: theme.radius.md, borderColor: theme.colors.border.primary },
        ]}
      >
        <AppListItem
          title="How far you travel"
          subtitle="Set your radius and the localities you serve"
          value={`${serviceRadiusKm} km`}
          leading={<Navigation size={18} color={theme.colors.brand.primary} />}
          onPress={() => router.push("/areas")}
        />
      </View>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  half: { flexBasis: 140, flexGrow: 1 },
  link: { borderWidth: 1, overflow: "hidden" },
});
