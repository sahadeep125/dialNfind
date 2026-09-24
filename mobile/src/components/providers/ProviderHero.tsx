import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ArrowLeft, BadgeCheck, MapPin } from "lucide-react-native";

import { AppAvatar, AppBadge, AppIconButton, AppText } from "@/components/design-system";
import { palette } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderDetail } from "@/types";
import { formatDistance } from "@/utils/format";
import { FavoriteButton } from "./FavoriteButton";
import { RatingSummary } from "./RatingSummary";

interface Props {
  provider: ProviderDetail;
  topInset: number;
}

/** Cover photo, logo, name and the key facts at the top of a provider profile. */
export function ProviderHero({ provider: p, topInset }: Props) {
  const theme = useTheme();
  const distance = formatDistance(p.distanceKm);
  const place = [p.locality, p.city].filter(Boolean).join(", ");

  return (
    <View>
      <View style={[styles.cover, { height: 170 + topInset, backgroundColor: palette.indigo500 }]}>
        {p.coverUrl ? (
          <Image
            source={{ uri: p.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View style={[styles.coverBar, { top: topInset + 8 }]}>
          <AppIconButton
            accessibilityLabel="Go back"
            variant="surface"
            icon={<ArrowLeft size={22} color={theme.colors.text.primary} />}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
          <FavoriteButton
            providerId={p.id}
            businessName={p.businessName}
            isFavorite={p.isFavorite}
            variant="surface"
          />
        </View>
      </View>
      <View style={[styles.body, { paddingHorizontal: theme.spacing[4], gap: theme.spacing[2] }]}>
        <View
          style={[
            styles.logo,
            { borderColor: theme.colors.background.primary, borderRadius: theme.radius.xl },
          ]}
        >
          <AppAvatar name={p.businessName} uri={p.logoUrl} size={76} shape="rounded" />
        </View>
        <View style={styles.nameRow}>
          <AppText variant="title" style={styles.shrink} accessibilityRole="header">
            {p.businessName}
          </AppText>
          {p.verificationStatus === "verified" ? (
            <BadgeCheck
              size={22}
              color={theme.colors.brand.primary}
              accessibilityLabel="Verified"
            />
          ) : null}
        </View>
        <AppText tone="secondary">
          {p.primaryCategory?.name ?? "Local service"}
          {p.subcategories.length ? ` · ${p.subcategories.slice(0, 3).join(", ")}` : ""}
        </AppText>
        <View style={styles.meta}>
          <RatingSummary rating={p.avgRating} count={p.totalReviews} />
          {place ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color={theme.colors.text.tertiary} />
              <AppText variant="caption" tone="secondary">
                {distance ? `${place} · ${distance}` : place}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.badges}>
          <AppBadge
            label={p.isOpenNow ? `Open now · ${p.todayHours}` : `Closed now · ${p.todayHours}`}
            tone={p.isOpenNow ? "success" : "neutral"}
          />
          {p.verificationStatus === "verified" ? <AppBadge label="Verified" tone="brand" /> : null}
          {p.yearsExperience ? <AppBadge label={`${p.yearsExperience}+ years`} /> : null}
          {p.badges.map((b) => (
            <AppBadge key={b.id} label={b.name} tone="warning" />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { overflow: "hidden", width: "100%" },
  coverBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    position: "absolute",
    right: 12,
  },
  body: { marginTop: -40 },
  logo: { alignSelf: "flex-start", borderWidth: 4, overflow: "hidden" },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  shrink: { flexShrink: 1 },
  meta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
});
