import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { MapPinned, Plus } from "lucide-react-native";

import { AppButton, AppInput, AppText } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { EmptyState } from "@/components/layout";
import { FormSection } from "@/components/profile/FormSection";
import { SaveBar } from "@/components/profile/SaveBar";
import { useSaveServiceAreas } from "@/hooks/useServiceAreas";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { LocationOption, ProviderProfile, ServiceArea } from "@/types";
import { AreaChip } from "./AreaChip";
import { areaError, cleanAreas, MAX_AREAS, radiusOptions } from "./areaRules";
import { LocationSearchField } from "./LocationSearchField";

interface Props {
  profile: ProviderProfile;
}

export function AreasEditor({ profile }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const save = useSaveServiceAreas();
  const initial = useMemo(() => cleanAreas(profile.serviceAreas), [profile.serviceAreas]);
  const [areas, setAreas] = useState<ServiceArea[]>(initial);
  const [radius, setRadius] = useState(profile.serviceRadiusKm);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const radiusChanged = radius !== profile.serviceRadiusKm;
  const dirty = radiusChanged || JSON.stringify(areas) !== JSON.stringify(initial);

  const add = (area: ServiceArea): boolean => {
    const problem = areaError(areas, area.areaName);
    setError(problem);
    if (problem) return false;
    setAreas((list) => [...list, { ...area, areaName: area.areaName.trim() }]);
    return true;
  };

  const pick = (l: LocationOption): void => {
    add({ areaName: l.name, pincode: null, latitude: l.latitude, longitude: l.longitude });
  };

  const addCustom = (): void => {
    if (add({ areaName: custom, pincode: null, latitude: null, longitude: null })) setCustom("");
  };

  const remove = useCallback((name: string) => {
    setAreas((list) => list.filter((a) => a.areaName !== name));
  }, []);

  const submit = (): void => {
    save.mutate(
      { areas, serviceRadiusKm: radiusChanged ? radius : undefined },
      {
        onSuccess: (provider) => {
          setAreas(cleanAreas(provider.serviceAreas));
          setRadius(provider.serviceRadiusKm);
          toast("Service areas saved", "success");
        },
        onError: (e: Error) => toast(errorMessage(e), "error"),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}
      >
        <FormSection
          title="How far you travel"
          description="You appear in nearby searches within this distance of your business location."
        >
          <AppSelect
            label="Travel radius"
            options={radiusOptions(profile.serviceRadiusKm)}
            value={radius}
            onChange={setRadius}
          />
        </FormSection>

        <FormSection
          title="Localities you serve"
          description="Customers searching these areas by name will find you too."
        >
          <LocationSearchField placeholder="Search a locality to add" onPick={pick} />
          <View style={[styles.row, { gap: theme.spacing[2] }]}>
            <View style={styles.flex}>
              <AppInput
                value={custom}
                onChangeText={(v) => {
                  setCustom(v);
                  if (error) setError(null);
                }}
                onSubmitEditing={addCustom}
                returnKeyType="done"
                placeholder="Or type an area name"
                accessibilityLabel="Area name"
                maxLength={80}
                error={error}
              />
            </View>
            <AppButton
              variant="secondary"
              leadingIcon={<Plus size={16} color={theme.colors.text.primary} />}
              onPress={addCustom}
            >
              Add
            </AppButton>
          </View>
          {areas.length ? (
            <>
              <AppText variant="caption" tone="tertiary">
                {areas.length} of {MAX_AREAS}. Tap an area to remove it.
              </AppText>
              <View style={[styles.chips, { gap: theme.spacing[2] }]}>
                {areas.map((a) => (
                  <AreaChip key={a.areaName} name={a.areaName} onRemove={remove} />
                ))}
              </View>
            </>
          ) : (
            <EmptyState
              icon={MapPinned}
              title="No areas yet"
              text="Add the localities you travel to. Customers searching them will see you."
            />
          )}
        </FormSection>
      </ScrollView>
      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={submit}
        onDiscard={() => {
          setAreas(initial);
          setRadius(profile.serviceRadiusKm);
          setError(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { alignItems: "flex-start", flexDirection: "row" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
