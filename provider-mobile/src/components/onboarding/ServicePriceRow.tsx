import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Star, Trash2 } from "lucide-react-native";

import { AppIconButton, AppInput, AppText } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { PriceUnit } from "@/types";
import type { ServiceDraft } from "@/types/onboarding";
import { PRICE_UNIT_OPTIONS, priceError } from "@/utils/onboarding";

interface Props {
  service: ServiceDraft;
  name: string;
  onChange: (patch: Partial<ServiceDraft>) => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}

/** Starting price, price unit and main-service star for one chosen service. */
export const ServicePriceRow = memo(function ServicePriceRow({
  service,
  name,
  onChange,
  onMakePrimary,
  onRemove,
}: Props) {
  const theme = useTheme();
  const error = priceError(service.startingPrice);
  return (
    <View style={{ gap: theme.spacing[2], paddingVertical: theme.spacing[3] }}>
      <View style={styles.head}>
        <AppIconButton
          size="sm"
          accessibilityLabel={
            service.isPrimary ? `${name} is your main service` : `Make ${name} your main service`
          }
          icon={
            <Star
              size={18}
              color={service.isPrimary ? theme.colors.star : theme.colors.text.tertiary}
              fill={service.isPrimary ? theme.colors.star : "transparent"}
            />
          }
          onPress={onMakePrimary}
        />
        <View style={styles.name}>
          <AppText variant="label" numberOfLines={2}>
            {name}
          </AppText>
          {service.isPrimary ? (
            <AppText variant="caption" tone="brand">
              Main service
            </AppText>
          ) : null}
        </View>
        <AppIconButton
          size="sm"
          accessibilityLabel={`Remove ${name}`}
          icon={<Trash2 size={18} color={theme.colors.semantic.danger} />}
          onPress={onRemove}
        />
      </View>
      <View style={[styles.fields, { gap: theme.spacing[2] }]}>
        <View style={styles.field}>
          <AppInput
            accessibilityLabel={`Starting price for ${name}`}
            value={service.startingPrice === null ? "" : String(service.startingPrice)}
            onChangeText={(v) => {
              const digits = v.replace(/\D/g, "").slice(0, 7);
              onChange({ startingPrice: digits === "" ? null : Number(digits) });
            }}
            error={error}
            keyboardType="number-pad"
            placeholder="Price"
            leadingIcon={
              <AppText variant="caption" tone="tertiary">
                Rs
              </AppText>
            }
          />
        </View>
        <View style={styles.field}>
          <AppSelect<PriceUnit>
            options={PRICE_UNIT_OPTIONS}
            value={service.priceUnit}
            onChange={(priceUnit) => onChange({ priceUnit })}
            placeholder="Price unit"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row", gap: 8 },
  name: { flex: 1, gap: 2 },
  fields: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap" },
  field: { flexBasis: 130, flexGrow: 1 },
});
