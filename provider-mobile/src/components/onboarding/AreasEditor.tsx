import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Plus, X } from "lucide-react-native";

import { AppButton, AppInput, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ServiceArea } from "@/types";
import { areaError } from "@/utils/onboarding";
import { LocationSearchField } from "./LocationSearchField";

interface Props {
  value: ServiceArea[];
  onChange: (areas: ServiceArea[]) => void;
}

/** Localities the business travels to, picked from search or typed by hand. */
export function AreasEditor({ value, onChange }: Props) {
  const theme = useTheme();
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (area: ServiceArea): boolean => {
    const problem = areaError(value, area.areaName);
    setError(problem);
    if (problem) return false;
    onChange([...value, { ...area, areaName: area.areaName.trim() }]);
    return true;
  };

  const addCustom = (): void => {
    if (add({ areaName: custom })) setCustom("");
  };

  return (
    <View style={{ gap: theme.spacing[3] }}>
      <LocationSearchField
        placeholder="Add a locality you serve"
        onPick={(l) => add({ areaName: l.name, latitude: l.latitude, longitude: l.longitude })}
      />
      <View style={[styles.customRow, { gap: theme.spacing[2] }]}>
        <View style={styles.flex}>
          <AppInput
            accessibilityLabel="Area name"
            value={custom}
            onChangeText={(v) => {
              setCustom(v);
              if (error) setError(null);
            }}
            error={error}
            maxLength={80}
            placeholder="Or type an area name"
            returnKeyType="done"
            onSubmitEditing={addCustom}
          />
        </View>
        <AppButton
          variant="secondary"
          onPress={addCustom}
          leadingIcon={<Plus size={16} color={theme.colors.text.primary} />}
        >
          Add
        </AppButton>
      </View>
      {value.length ? (
        <View style={[styles.chips, { gap: theme.spacing[2] }]}>
          {value.map((a) => (
            <View
              key={a.areaName}
              style={[
                styles.chip,
                {
                  gap: theme.spacing[1],
                  paddingLeft: theme.spacing[3],
                  backgroundColor: theme.colors.brand.soft,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: theme.colors.brand.softText }}>
                {a.areaName}
              </AppText>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${a.areaName}`}
                hitSlop={8}
                onPress={() => onChange(value.filter((x) => x !== a))}
                style={styles.remove}
              >
                <X size={14} color={theme.colors.brand.softText} />
              </AppPressable>
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="caption" tone="tertiary">
          No areas yet. Customers searching these localities will see you.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  customRow: { alignItems: "flex-start", flexDirection: "row" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: { alignItems: "center", borderRadius: 9999, flexDirection: "row", minHeight: 32 },
  remove: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
});
