import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Star, Trash2 } from "lucide-react-native";

import { AppBadge, AppIconButton, AppPressable, AppText } from "@/components/design-system";
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

/** One service: name, starting price and category. Tap to edit the price. */
export const ServiceRow = memo(function ServiceRow({
  service,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const name = serviceName(service);
  const price = formatPrice(service.startingPrice, service.priceUnit);
  const category = service.subcategory && service.category ? service.category.name : null;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${name}`}
      onPress={() => onEdit(service)}
      scale={false}
    >
      <View
        style={[
          styles.row,
          {
            gap: theme.spacing[3],
            paddingLeft: 14,
            paddingRight: theme.spacing[2],
            paddingVertical: theme.spacing[2.5],
          },
        ]}
      >
        <View style={[styles.body, { gap: 2 }]}>
          <View style={[styles.line, { gap: theme.spacing[1.5] }]}>
            <AppText variant="label" numberOfLines={1} style={styles.shrink}>
              {name}
            </AppText>
            {service.isPrimary ? (
              <AppBadge
                label="Main"
                tone="warning"
                icon={
                  <Star
                    size={10}
                    color={theme.colors.semantic.warningText}
                    fill={theme.colors.semantic.warningText}
                  />
                }
              />
            ) : null}
          </View>
          <AppText variant="meta" numberOfLines={1}>
            {[category, price ? null : "Add a starting price"].filter(Boolean).join(" · ") || " "}
          </AppText>
        </View>
        {price ? (
          <AppText variant="label" numeric>
            {price}
          </AppText>
        ) : null}
        <AppIconButton
          accessibilityLabel={`Remove ${name}`}
          size="sm"
          disabled={!canDelete}
          icon={<Trash2 size={15} color={theme.colors.text.tertiary} />}
          onPress={() => onDelete(service)}
        />
      </View>
    </AppPressable>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1, minWidth: 0 },
  line: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
});
