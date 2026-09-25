import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppButton, AppInput, AppText } from "@/components/design-system";
import { AppSelect, AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Category, SelectOption } from "@/types";
import type { ServiceDraft } from "@/types/listing";
import { PRICE_UNIT_OPTIONS, priceError, serviceKey } from "./serviceRules";

interface Props {
  /** Editing hides the category and service pickers; only price, unit and main flag change. */
  editing: boolean;
  draft: ServiceDraft;
  categories: Category[];
  takenKeys: Set<string>;
  saving: boolean;
  onSave: (draft: ServiceDraft) => void;
}

/** The add or edit service form shown inside ServiceSheet. */

export function ServiceForm({
  editing,
  draft: initial,
  categories,
  takenKeys,
  saving,
  onSave,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const categoryOptions = useMemo<SelectOption<number>[]>(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const subOptions = useMemo<SelectOption<number>[]>(() => {
    const category = categories.find((c) => c.id === draft.categoryId);
    return (category?.subcategories ?? [])
      .filter((s) => !takenKeys.has(serviceKey({ categoryId: s.categoryId, subcategoryId: s.id })))
      .map((s) => ({ value: s.id, label: s.name }));
  }, [categories, draft.categoryId, takenKeys]);

  const set = (patch: Partial<ServiceDraft>): void => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, null])) }));
  };

  const submit = (): void => {
    const next = {
      categoryId: !editing && !draft.categoryId ? "Choose a category" : null,
      subcategoryId: !editing && !draft.subcategoryId ? "Choose the service you offer" : null,
      price: priceError(draft.price),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSave(draft);
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}
    >
      {editing ? null : (
        <>
          <AppSelect
            label="Category"
            required
            placeholder="Choose a category"
            options={categoryOptions}
            value={draft.categoryId}
            onChange={(categoryId) => set({ categoryId, subcategoryId: null })}
            error={errors.categoryId}
          />
          <AppSelect
            label="Service"
            required
            placeholder={
              draft.categoryId
                ? subOptions.length
                  ? "Choose a service"
                  : "You already offer every service here"
                : "Choose a category first"
            }
            options={subOptions}
            value={draft.subcategoryId}
            onChange={(subcategoryId) => set({ subcategoryId })}
            disabled={!draft.categoryId || !subOptions.length}
            error={errors.subcategoryId}
          />
        </>
      )}
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View style={styles.cell}>
          <AppInput
            label="Starting price (Rs)"
            value={draft.price}
            onChangeText={(v) => set({ price: v.replace(/[^\d]/g, "") })}
            error={errors.price}
            keyboardType="number-pad"
            placeholder="e.g. 399"
            maxLength={7}
          />
        </View>
        <View style={styles.cell}>
          <AppSelect
            label="Price is"
            options={PRICE_UNIT_OPTIONS}
            value={draft.priceUnit}
            onChange={(priceUnit) => set({ priceUnit })}
          />
        </View>
      </View>
      <AppText variant="caption" tone="tertiary">
        A starting price makes customers far more likely to call. Leave it empty to show no price.
      </AppText>
      <AppSwitchRow
        label="Main service"
        description="Decides which category you appear under first."
        value={draft.isPrimary}
        onValueChange={(isPrimary) => set({ isPrimary })}
      />
      <AppButton size="lg" fullWidth loading={saving} onPress={submit}>
        {editing ? "Save service" : "Add service"}
      </AppButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flexBasis: 140, flexGrow: 1 },
});
