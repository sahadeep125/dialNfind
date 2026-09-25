import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Pencil, Star, Trash2 } from "lucide-react-native";

import { AppBadge, AppCard, AppIconButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderService } from "@/types";
import { formatPrice } from "@/utils/format";
import { serviceName } from "./serviceRules";

interface Props {
  service: ProviderService;
  canDelete: boolean;
  onEdit: (service: ProviderService) => void;
  onDelete: (service: ProviderService) => void;
}

export const ServiceRow = memo(function ServiceRow({
  service,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const name = serviceName(service);
  const price = formatPrice(service.startingPrice, service.priceUnit);
  return (
    <AppCard onPress={() => onEdit(service)} accessibilityLabel={`Edit ${name}`} padding={0}>
      <View style={[styles.row, { gap: theme.spacing[3], padding: theme.spacing[4] }]}>
        <View style={[styles.body, { gap: theme.spacing[1] }]}>
          <AppText variant="label" numberOfLines={2}>
            {name}
          </AppText>
          {service.subcategory && service.category ? (
            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
              {service.category.name}
            </AppText>
          ) : null}
          <View style={[styles.meta, { gap: theme.spacing[2] }]}>
            <AppText variant="caption" tone={price ? "primary" : "tertiary"}>
              {price ?? "No starting price"}
            </AppText>
            {service.isPrimary ? (
              <AppBadge
                label="Main service"
                tone="warning"
                icon={
                  <Star
                    size={11}
                    color={theme.colors.semantic.warningText}
                    fill={theme.colors.semantic.warningText}
                  />
                }
              />
            ) : null}
          </View>
        </View>
        <Pencil size={16} color={theme.colors.text.tertiary} />
        <AppIconButton
          accessibilityLabel={`Remove ${name}`}
          size="sm"
          disabled={!canDelete}
          icon={<Trash2 size={18} color={theme.colors.semantic.danger} />}
          onPress={() => onDelete(service)}
        />
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1 },
  meta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
});
