import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton, AppCard, AppDivider, AppSkeleton, AppText } from "@/components/design-system";
import { useAttributes, useSaveAttributes } from "@/hooks/useAttributes";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type {
  AttributeGroup,
  AttributeValue,
  AttributeValueInput,
  CategoryAttribute,
} from "@/types/listing";
import { AttributeField } from "./AttributeField";

const keyOf = (g: AttributeGroup, a: CategoryAttribute): string => `${g.providerServiceId}:${a.id}`;

function problem(a: CategoryAttribute, v: AttributeValue): string | null {
  const empty = v === null || v === "" || (Array.isArray(v) && v.length === 0);
  if (empty) {
    if (!a.isRequired) return null;
    return a.fieldType === "select" || a.fieldType === "multiselect"
      ? "Choose an option"
      : "This answer is required";
  }
  if (a.fieldType === "number" && (typeof v !== "number" || !Number.isFinite(v) || v < 0))
    return "Enter a number of 0 or more";
  if (a.fieldType === "text" && String(v).trim().length > 300)
    return "Keep it under 300 characters";
  return null;
}

/**
 * Category questions answered by the provider, e.g. "Brands serviced". Shown on the public
 * profile. Renders nothing when no category the provider offers has questions.
 */
export function ServiceDetailsCard() {
  const theme = useTheme();
  const toast = useToast();
  const attributes = useAttributes();
  const save = useSaveAttributes();
  const [edits, setEdits] = useState<Record<string, AttributeValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (attributes.isLoading) {
    return (
      <AppCard>
        <View style={{ gap: theme.spacing[3] }}>
          <AppSkeleton width="40%" height={18} />
          <AppSkeleton height={38} shape="block" />
        </View>
      </AppCard>
    );
  }
  const groups = attributes.data ?? [];
  if (!groups.length) return null;

  const valueOf = (g: AttributeGroup, a: CategoryAttribute): AttributeValue =>
    keyOf(g, a) in edits ? edits[keyOf(g, a)] : a.value;
  const set = (g: AttributeGroup, a: CategoryAttribute, v: AttributeValue): void => {
    const k = keyOf(g, a);
    setEdits((e) => ({ ...e, [k]: v }));
    setErrors(({ [k]: _removed, ...rest }) => rest);
  };
  const dirty = Object.keys(edits).length > 0;

  const submit = (): void => {
    const found: Record<string, string> = {};
    for (const g of groups)
      for (const a of g.attributes) {
        const msg = problem(a, valueOf(g, a));
        if (msg) found[keyOf(g, a)] = msg;
      }
    setErrors(found);
    if (Object.keys(found).length) {
      toast("Answer the highlighted questions", "error");
      return;
    }
    const values: AttributeValueInput[] = Object.entries(edits).map(([k, value]) => {
      const [providerServiceId, attributeId] = k.split(":").map(Number);
      return {
        providerServiceId,
        attributeId,
        value: typeof value === "string" ? value.trim() || null : value,
      };
    });
    save.mutate(values, {
      onSuccess: () => {
        setEdits({});
        toast("Service details saved", "success");
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  return (
    <AppCard>
      <View style={{ gap: theme.spacing[1], marginBottom: theme.spacing[4] }}>
        <AppText variant="heading" accessibilityRole="header">
          Service details
        </AppText>
        <AppText variant="caption" tone="secondary">
          Answer a few questions about your work. These show on your public profile and help
          customers choose you.
        </AppText>
      </View>
      <View style={{ gap: theme.spacing[4] }}>
        {groups.map((g, i) => (
          <View key={g.providerServiceId} style={{ gap: theme.spacing[4] }}>
            {i > 0 ? <AppDivider /> : null}
            {groups.length > 1 ? (
              <AppText variant="overline" tone="secondary">
                {g.title}
              </AppText>
            ) : null}
            {g.attributes.map((a) => (
              <AttributeField
                key={a.id}
                attribute={a}
                value={valueOf(g, a)}
                error={errors[keyOf(g, a)]}
                onChange={(v) => set(g, a, v)}
              />
            ))}
          </View>
        ))}
        <View style={[styles.actions, { gap: theme.spacing[3] }]}>
          {dirty ? (
            <AppButton
              variant="ghost"
              disabled={save.isPending}
              onPress={() => {
                setEdits({});
                setErrors({});
              }}
            >
              Discard
            </AppButton>
          ) : null}
          <AppButton onPress={submit} loading={save.isPending} disabled={!dirty}>
            Save details
          </AppButton>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" },
});
