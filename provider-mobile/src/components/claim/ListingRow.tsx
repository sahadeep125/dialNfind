import { memo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BadgeCheck, MapPin, Star } from "lucide-react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ClaimListing } from "@/types/onboarding";

interface Props {
  listing: ClaimListing;
  action?: ReactNode;
}

/** One listing in the claim flow: name, place, main category and rating. */
export const ListingRow = memo(function ListingRow({ listing, action }: Props) {
  const theme = useTheme();
  const place = listing.locality ? `${listing.locality}, ${listing.city}` : listing.city;
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing[3],
          padding: theme.spacing[3],
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border.primary,
          backgroundColor: theme.colors.background.elevated,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.md },
        ]}
      >
        <BadgeCheck size={20} color={theme.colors.brand.primary} />
      </View>
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={2}>
          {listing.businessName}
        </AppText>
        <View style={[styles.meta, { columnGap: theme.spacing[3] }]}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={theme.colors.text.secondary} />
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {place}
            </AppText>
          </View>
          {listing.category ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {listing.category}
            </AppText>
          ) : null}
          {listing.totalReviews > 0 ? (
            <View style={styles.metaItem}>
              <Star size={12} color={theme.colors.star} fill={theme.colors.star} />
              <AppText variant="caption" tone="secondary">
                {`${Number(listing.avgRating).toFixed(1)} (${listing.totalReviews})`}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", borderWidth: 1, flexDirection: "row" },
  icon: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  body: { flex: 1, gap: 4, minWidth: 0 },
  meta: { flexDirection: "row", flexWrap: "wrap", rowGap: 2 },
  metaItem: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 4 },
});
