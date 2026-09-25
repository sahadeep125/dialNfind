import { Fragment, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { AppChip, AppDivider, AppSkeleton, AppText } from "@/components/design-system";
import { ErrorState } from "@/components/layout";
import { useCategories } from "@/hooks/useCategories";
import { useTheme } from "@/hooks/useTheme";
import type { Category } from "@/types";
import type { ServiceDraft, StepErrors } from "@/types/onboarding";
import { ServicePriceRow } from "./ServicePriceRow";
import { StepTitle } from "./StepTitle";

interface Props {
  value: ServiceDraft[];
  errors: StepErrors;
  onChange: (services: ServiceDraft[]) => void;
}

function serviceName(categories: Category[], s: ServiceDraft): string {
  const category = categories.find((c) => c.id === s.categoryId);
  return (
    category?.subcategories.find((x) => x.id === s.subcategoryId)?.name ??
    category?.name ??
    "Service"
  );
}

/** Step 2: pick a category, tick the services offered, then add starting prices. */
export function ServicesStep({ value, errors, onChange }: Props) {
  const theme = useTheme();
  const categories = useCategories();
  const list = categories.data ?? [];
  const [categoryId, setCategoryId] = useState<number | null>(value[0]?.categoryId ?? null);
  const category = list.find((c) => c.id === categoryId);
  const isSelected = (subId: number): boolean => value.some((s) => s.subcategoryId === subId);

  const toggle = (catId: number, subId: number): void => {
    if (isSelected(subId)) {
      const rest = value.filter((s) => s.subcategoryId !== subId);
      // Keep one main service when the starred one is removed.
      if (rest.length && !rest.some((s) => s.isPrimary)) rest[0] = { ...rest[0], isPrimary: true };
      onChange(rest);
    } else {
      onChange([
        ...value,
        {
          categoryId: catId,
          subcategoryId: subId,
          startingPrice: null,
          priceUnit: "per_visit",
          isPrimary: value.length === 0,
        },
      ]);
    }
  };

  const update = (index: number, patch: Partial<ServiceDraft>): void =>
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const makePrimary = (index: number): void =>
    onChange(value.map((s, i) => ({ ...s, isPrimary: i === index })));
  const remove = (index: number): void => {
    const rest = value.filter((_, i) => i !== index);
    if (rest.length && !rest.some((s) => s.isPrimary)) rest[0] = { ...rest[0], isPrimary: true };
    onChange(rest);
  };

  return (
    <View style={{ gap: theme.spacing[5] }}>
      <StepTitle
        title="What services do you offer?"
        subtitle="Customers find you through these. Add a starting price so they know what to expect."
      />

      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="secondary">
          Category
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Categories are managed by DialNFind so customers can find you. Pick the ones that match
          your work.
        </AppText>
        {categories.isLoading ? (
          <View style={[styles.chips, { gap: theme.spacing[2] }]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <AppSkeleton key={i} width={110} height={38} shape="block" />
            ))}
          </View>
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <View style={[styles.chips, { gap: theme.spacing[2] }]}>
            {list.map((c) => {
              const count = value.filter((s) => s.categoryId === c.id).length;
              return (
                <AppChip
                  key={c.id}
                  label={count ? `${c.name} (${count})` : c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              );
            })}
          </View>
        )}
      </View>

      {category ? (
        <View style={{ gap: theme.spacing[2] }}>
          <AppText variant="label" tone="secondary">
            {`Services you offer in ${category.name}`}
          </AppText>
          <View style={[styles.chips, { gap: theme.spacing[2] }]}>
            {category.subcategories.map((s) => {
              const selected = isSelected(s.id);
              return (
                <AppChip
                  key={s.id}
                  label={s.name}
                  selected={selected}
                  leadingIcon={
                    selected ? (
                      <Check size={14} color={theme.components.button.primary.text} />
                    ) : undefined
                  }
                  onPress={() => toggle(category.id, s.id)}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {errors.services ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {errors.services}
        </AppText>
      ) : null}

      {value.length > 0 ? (
        <View style={{ gap: theme.spacing[1] }}>
          <AppText variant="label" tone="secondary">
            Starting prices
          </AppText>
          <View>
            {value.map((s, i) => (
              <Fragment key={`${s.categoryId}-${s.subcategoryId ?? "all"}`}>
                {i > 0 ? <AppDivider /> : null}
                <ServicePriceRow
                  service={s}
                  name={serviceName(list, s)}
                  onChange={(patch) => update(i, patch)}
                  onMakePrimary={() => makePrimary(i)}
                  onRemove={() => remove(i)}
                />
              </Fragment>
            ))}
          </View>
          <AppText variant="caption" tone="tertiary">
            The star marks your main service. It decides which category you appear under first.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
