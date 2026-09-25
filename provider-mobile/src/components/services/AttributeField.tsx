import { StyleSheet, View } from "react-native";

import { AppChip, AppInput, AppText } from "@/components/design-system";
import { AppSelect, AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { AttributeValue, CategoryAttribute } from "@/types/listing";

interface Props {
  attribute: CategoryAttribute;
  value: AttributeValue;
  error?: string | null;
  onChange: (value: AttributeValue) => void;
}

/** One category question, drawn to match its field type. */
export function AttributeField({ attribute: a, value, error, onChange }: Props) {
  const theme = useTheme();

  if (a.fieldType === "boolean") {
    return (
      <View>
        <AppSwitchRow
          label={a.isRequired ? `${a.label} *` : a.label}
          description={value === true ? "Yes" : value === false ? "No" : "Not answered"}
          value={value === true}
          onValueChange={onChange}
        />
        {error ? (
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }

  if (a.fieldType === "select") {
    return (
      <AppSelect
        label={a.label}
        required={a.isRequired}
        placeholder="Choose one"
        options={a.options.map((o) => ({ value: o, label: o }))}
        value={typeof value === "string" ? value : null}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (a.fieldType === "multiselect") {
    const list = Array.isArray(value) ? value : [];
    return (
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="secondary">
          {a.label}
          {a.isRequired ? (
            <AppText variant="label" tone="danger">
              {" "}
              *
            </AppText>
          ) : null}
        </AppText>
        <View style={[styles.chips, { gap: theme.spacing[2] }]}>
          {a.options.map((o) => {
            const on = list.includes(o);
            return (
              <AppChip
                key={o}
                size="sm"
                label={o}
                selected={on}
                onPress={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}
              />
            );
          })}
        </View>
        {error ? (
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }

  const isNumber = a.fieldType === "number";
  return (
    <AppInput
      label={a.label}
      required={a.isRequired}
      value={value === null || value === undefined ? "" : String(value)}
      onChangeText={(t) => {
        if (!isNumber) return onChange(t);
        const digits = t.replace(/[^\d]/g, "");
        onChange(digits === "" ? null : Number(digits));
      }}
      keyboardType={isNumber ? "number-pad" : "default"}
      maxLength={isNumber ? 9 : 300}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
