import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { BadgeCheck, MapPin } from "lucide-react-native";

import { AppAvatar, AppBadge, AppCard, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderCard as ProviderCardData } from "@/types";
import { formatDistance, formatPrice } from "@/utils/format";
import { ContactButtons } from "./ContactButtons";
import { FavoriteButton } from "./FavoriteButton";
import { RatingSummary } from "./RatingSummary";

interface Props {
  provider: ProviderCardData;
  source?: "search" | "category_browse" | "profile";
}

/** One provider in a list: who they are, how far, rating, price and the two ways to reach them. */
export const ProviderCard = memo(function ProviderCard({ provider: p, source = "search" }: Props) {
  const theme = useTheme();
  const distance = formatDistance(p.distanceKm);
  const price = formatPrice(p.startingPrice, p.priceUnit);
  const place = [p.locality, p.city].filter(Boolean).join(", ");

  return (
    <AppCard
      onPress={() => router.push(`/provider/${p.slug}`)}
      accessibilityLabel={`${p.businessName}, open profile`}
      padding={theme.spacing[4]}
    >
      <View style={styles.top}>
        <AppAvatar name={p.businessName} uri={p.logoUrl} size={52} shape="rounded" />
        <View style={styles.main}>
          <View style={styles.nameRow}>
            <AppText variant="subheading" numberOfLines={2} style={styles.shrink}>
              {p.businessName}
            </AppText>
            {p.verificationStatus === "verified" ? (
              <BadgeCheck
                size={17}
                color={theme.colors.brand.primary}
                accessibilityLabel="Verified"
              />
            ) : null}
          </View>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {p.primaryCategory?.name ?? "Local service"}
            {p.subcategories.length ? ` · ${p.subcategories.slice(0, 2).join(", ")}` : ""}
          </AppText>
          <View style={styles.meta}>
            <RatingSummary rating={p.avgRating} count={p.totalReviews} />
            {distance || place ? (
              <View style={styles.metaItem}>
                <MapPin size={13} color={theme.colors.text.tertiary} />
                <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.shrink}>
                  {distance ?? place}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <FavoriteButton providerId={p.id} businessName={p.businessName} isFavorite={p.isFavorite} />
      </View>

      <View style={styles.badges}>
        {p.isSponsored ? <AppBadge label="Sponsored" tone="warning" /> : null}
        <AppBadge
          label={p.isOpenNow ? "Open now" : "Closed now"}
          tone={p.isOpenNow ? "success" : "neutral"}
        />
        {price ? <AppBadge label={`From ${price}`} tone="brand" /> : null}
        {p.yearsExperience ? <AppBadge label={`${p.yearsExperience}+ yrs`} /> : null}
      </View>

      {p.shortDescription ? (
        <AppText
          variant="caption"
          tone="secondary"
          numberOfLines={2}
          style={{ marginTop: theme.spacing[2] }}
        >
          {p.shortDescription}
        </AppText>
      ) : null}

      <View style={{ marginTop: theme.spacing[3] }}>
        <ContactButtons provider={p} source={source} size="sm" />
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  top: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  main: { flex: 1, gap: 3 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  shrink: { flexShrink: 1 },
  meta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
  metaItem: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 3 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
});
