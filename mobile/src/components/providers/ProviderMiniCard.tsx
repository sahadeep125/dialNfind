import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, MapPin } from "lucide-react-native";

import { AppAvatar, AppBadge, AppCard, AppSkeleton, AppText } from "@/components/design-system";
import { CATEGORY_STYLES, FALLBACK_CATEGORY_STYLE } from "@/constants/categories";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderCard } from "@/types";
import { formatDistance } from "@/utils/format";
import { FavoriteButton } from "./FavoriteButton";
import { RatingSummary } from "./RatingSummary";

const COVER = 112;

interface Props {
  provider: ProviderCard;
  width: number;
}

/** A provider in a Home carousel: cover, logo, name, rating and distance. Tapping opens the profile. */
export const ProviderMiniCard = memo(function ProviderMiniCard({ provider: p, width }: Props) {
  const theme = useTheme();
  const tint = ((p.primaryCategory && CATEGORY_STYLES[p.primaryCategory.slug]) ||
    FALLBACK_CATEGORY_STYLE)[theme.mode];
  const distance = formatDistance(p.distanceKm) ?? p.locality ?? p.city;
  const verified = p.verificationStatus === "verified";

  return (
    <AppCard
      onPress={() => router.push(`/provider/${p.slug}`)}
      accessibilityLabel={`${p.businessName}, open profile`}
      padding={0}
      style={{ width }}
    >
      <View style={[styles.cover, { backgroundColor: tint.bg }]}>
        {p.coverUrl ? (
          <Image
            source={{ uri: p.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View style={styles.status}>
          <AppBadge
            dot
            label={p.isOpenNow ? "Open now" : "Closed"}
            tone={p.isOpenNow ? "success" : "neutral"}
          />
        </View>
        <View style={styles.favorite}>
          <FavoriteButton
            providerId={p.id}
            businessName={p.businessName}
            isFavorite={p.isFavorite}
            variant="overlay"
            size="sm"
          />
        </View>
      </View>

      <View style={[styles.logo, { left: theme.spacing[4] }]}>
        <AppAvatar
          name={p.businessName}
          uri={p.logoUrl}
          size={48}
          shape="rounded"
          ringColor={theme.colors.background.elevated}
        />
      </View>

      <View style={[styles.body, { padding: theme.spacing[4], paddingTop: theme.spacing[7] }]}>
        <View style={styles.nameRow}>
          <AppText variant="subheading" numberOfLines={1} style={styles.shrink}>
            {p.businessName}
          </AppText>
          {verified ? (
            <BadgeCheck
              size={17}
              color={theme.colors.contrast.onInk}
              fill={theme.colors.brand.primary}
              accessibilityLabel="Verified"
            />
          ) : null}
        </View>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {p.primaryCategory?.name ?? "Local service"}
        </AppText>
        <View style={[styles.meta, { marginTop: theme.spacing[1.5] }]}>
          <RatingSummary rating={p.avgRating} count={p.totalReviews} />
          {distance ? (
            <View style={styles.metaItem}>
              <MapPin size={13} color={theme.colors.text.tertiary} strokeWidth={2.2} />
              <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.shrink}>
                {distance}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
});

/** Placeholder with the ProviderMiniCard's shape. */
export function ProviderMiniCardSkeleton({ width }: { width: number }) {
  const theme = useTheme();
  return (
    <AppCard padding={0} style={{ width }}>
      <AppSkeleton height={COVER} shape="block" style={styles.skeletonCover} />
      <View style={{ gap: theme.spacing[2], padding: theme.spacing[4] }}>
        <AppSkeleton width="70%" height={16} />
        <AppSkeleton width="45%" />
        <AppSkeleton width="60%" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  cover: { height: COVER, overflow: "hidden" },
  status: { left: 10, position: "absolute", top: 10 },
  favorite: { position: "absolute", right: 8, top: 8 },
  logo: { position: "absolute", top: COVER - 24 },
  body: { gap: 2 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  shrink: { flexShrink: 1 },
  meta: { alignItems: "center", flexDirection: "row", gap: 10 },
  metaItem: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 3 },
  skeletonCover: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
});
