import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { LocateFixed, MapPin } from "lucide-react-native";

import { AppButton, AppChip, AppInput, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { getCurrentLocation } from "@/services/location";
import type { ServiceArea } from "@/types";
import type { LocationDraft, StepErrors } from "@/types/onboarding";
import { RADIUS_OPTIONS } from "@/utils/onboarding";
import { AreasEditor } from "./AreasEditor";
import { LocationSearchField } from "@/components/areas/LocationSearchField";
import { StepTitle } from "./StepTitle";

interface Props {
  value: LocationDraft;
  areas: ServiceArea[];
  errors: StepErrors;
  onChange: (patch: Partial<LocationDraft>) => void;
  onAreasChange: (areas: ServiceArea[]) => void;
}

const round = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Step 3: where the business is based, how far it travels, and the localities it serves. */
export function LocationStep({ value, areas, errors, onChange, onAreasChange }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const locateMe = async (): Promise<void> => {
    setLocating(true);
    try {
      const here = await getCurrentLocation();
      onChange({
        latitude: round(here.latitude),
        longitude: round(here.longitude),
        ...(here.city ? { city: here.city } : {}),
        ...(here.state ? { state: here.state } : {}),
        ...(here.city && here.name !== here.city ? { locality: here.name } : {}),
      });
      toast("Location set to where you are now", "success");
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing[5] }}>
      <StepTitle
        title="Where are you based?"
        subtitle="We show you to customers within your travel distance."
      />

      <View style={{ gap: theme.spacing[3] }}>
        <LocationSearchField
          label="Find your area"
          placeholder="Search your locality or city"
          onPick={(l) =>
            onChange({
              latitude: l.latitude,
              longitude: l.longitude,
              city: l.city || l.name,
              state: l.state || value.state,
              locality: l.kind === "city" ? value.locality : l.name,
            })
          }
        />
        <AppButton
          variant="secondary"
          loading={locating}
          onPress={() => void locateMe()}
          leadingIcon={<LocateFixed size={18} color={theme.colors.text.primary} />}
        >
          Use my current location
        </AppButton>
        <View style={[styles.coords, { gap: theme.spacing[1.5] }]}>
          <MapPin size={14} color={theme.colors.text.tertiary} />
          <AppText variant="caption" tone="tertiary" style={styles.flex}>
            {`Pinned at ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}. Customers nearby see you first.`}
          </AppText>
        </View>
      </View>

      <AppInput
        label="Street address"
        helper="Optional"
        value={value.addressLine}
        onChangeText={(v) => onChange({ addressLine: v })}
        error={errors.addressLine}
        maxLength={200}
        placeholder="Shop number, building, street"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
      />
      <View style={[styles.grid, { gap: theme.spacing[4] }]}>
        <View style={styles.cell}>
          <AppInput
            label="Locality"
            helper="Optional"
            value={value.locality}
            onChangeText={(v) => onChange({ locality: v })}
            error={errors.locality}
            maxLength={80}
            placeholder="e.g. Sevoke Road"
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="City"
            required
            value={value.city}
            onChangeText={(v) => onChange({ city: v })}
            error={errors.city}
            maxLength={60}
            textContentType="addressCity"
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="State"
            required
            value={value.state}
            onChangeText={(v) => onChange({ state: v })}
            error={errors.state}
            maxLength={60}
            textContentType="addressState"
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="PIN code"
            helper="Optional"
            value={value.pincode}
            onChangeText={(v) => onChange({ pincode: v.replace(/\D/g, "").slice(0, 6) })}
            error={errors.pincode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="734001"
            autoComplete="postal-code"
            textContentType="postalCode"
          />
        </View>
      </View>

      <View style={{ gap: theme.spacing[2] }}>
        <View style={styles.radiusHead}>
          <AppText variant="label" tone="secondary">
            How far will you travel?
          </AppText>
          <AppText variant="label" tone="brand">
            {`${value.serviceRadiusKm} km`}
          </AppText>
        </View>
        <View style={[styles.chips, { gap: theme.spacing[2] }]} accessibilityRole="radiogroup">
          {RADIUS_OPTIONS.map((km) => (
            <AppChip
              key={km}
              size="sm"
              label={`${km} km`}
              selected={value.serviceRadiusKm === km}
              onPress={() => onChange({ serviceRadiusKm: km })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="secondary">
          Localities you serve (optional)
        </AppText>
        <AreasEditor value={areas} onChange={onAreasChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  coords: { alignItems: "flex-start", flexDirection: "row" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flexBasis: 220, flexGrow: 1 },
  radiusHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
