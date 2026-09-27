import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { BadgeCheck, MapPin } from "lucide-react-native";

import { AppAvatar, AppBadge, AppCard, AppDivider, AppText } from "@/components/design-system";
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
  const verified = p.verificationStatus === "verified";

  return (
    <AppCard
      onPress={() => router.push(`/provider/${p.slug}`)}
      accessibilityLabel={`${p.businessName}, open profile`}
      padding={theme.spacing[4]}
      style={styles.card}
    >
      <View style={styles.top}>
        <AppAvatar name={p.businessName} uri={p.logoUrl} size={56} shape="rounded" />
        <View style={styles.main}>
          <View style={styles.nameRow}>
            <AppText variant="subheading" numberOfLines={2} style={styles.shrink}>
              {p.businessName}
            </AppText>
            {verified ? (
              <BadgeCheck
                size={18}
                color={theme.colors.contrast.onInk}
                fill={theme.colors.brand.primary}
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
                <MapPin size={13} color={theme.colors.text.tertiary} strokeWidth={2.2} />
                <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.shrink}>
                  {distance ?? place}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.favorite}>
          <FavoriteButton
            providerId={p.id}
            businessName={p.businessName}
            isFavorite={p.isFavorite}
            size="sm"
          />
        </View>
      </View>

      <View style={styles.badges}>
        <AppBadge
          dot
          label={p.isOpenNow ? "Open now" : "Closed now"}
          tone={p.isOpenNow ? "success" : "neutral"}
        />
        {price ? <AppBadge label={`From ${price}`} tone="brand" /> : null}
        {p.planTier ? (
          <AppBadge
            label={p.planTier === "business" ? "Business Partner" : "Pro Partner"}
            tone="accent"
          />
        ) : null}
        {p.isSponsored ? <AppBadge label="Sponsored" tone="warning" /> : null}
        {p.yearsExperience ? <AppBadge label={`${p.yearsExperience}+ yrs exp`} /> : null}
      </View>

      {p.shortDescription ? (
        <AppText
          variant="caption"
          tone="secondary"
          numberOfLines={2}
          style={{ marginTop: theme.spacing[3] }}
        >
          {p.shortDescription}
        </AppText>
      ) : null}

      <View style={styles.spacer} />
      <AppDivider style={{ marginVertical: theme.spacing[3] }} />
      <ContactButtons provider={p} source={source} size="sm" />
    </AppCard>
  );
});

const styles = StyleSheet.create({
  card: { flexGrow: 1 },
  top: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  main: { flex: 1, gap: 3 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  shrink: { flexShrink: 1 },
  favorite: { marginRight: -6, marginTop: -6 },
  meta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 3 },
  metaItem: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 3 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  // In a grid row, pushes the contact buttons to the bottom so cards of different heights line up.
  spacer: { flexGrow: 1 },
});
