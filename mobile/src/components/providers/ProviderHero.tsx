import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, Briefcase, ChevronLeft, MapPin, Share2, Star } from "lucide-react-native";

import {
  AppAvatar,
  AppBadge,
  AppBrandSurface,
  AppIconButton,
  AppStatRow,
  AppText,
} from "@/components/design-system";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { shareProvider } from "@/services/links";
import type { ProviderDetail } from "@/types";
import { formatDistance } from "@/utils/format";
import { FavoriteButton } from "./FavoriteButton";

interface Props {
  provider: ProviderDetail;
  topInset: number;
}

/** Cover photo, logo, name and the key facts at the top of a provider profile. */
export function ProviderHero({ provider: p, topInset }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const { gutter, isTablet } = useLayout();
  const distance = formatDistance(p.distanceKm);
  const place = [p.locality, p.city].filter(Boolean).join(", ");
  const coverHeight = (isTablet ? 260 : 200) + topInset;

  const stats = [
    {
      value: p.totalReviews ? p.avgRating.toFixed(1) : "New",
      label: p.totalReviews
        ? `${p.totalReviews.toLocaleString("en-IN")} reviews`
        : "No reviews yet",
      icon: Star,
      iconColor: theme.colors.star,
    },
    ...(p.yearsExperience ? [{ value: `${p.yearsExperience}+`, label: "Years exp." }] : []),
    ...(p.selfReportedCompletedJobs
      ? [
          {
            value: `${p.selfReportedCompletedJobs.toLocaleString("en-IN")}+`,
            label: "Jobs done",
            icon: Briefcase,
          },
        ]
      : []),
    ...(distance ? [{ value: distance.replace(" away", ""), label: "Away", icon: MapPin }] : []),
  ].slice(0, 4);

  const cover = p.coverUrl ? (
    <Image
      source={{ uri: p.coverUrl }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={200}
    />
  ) : null;

  return (
    <View>
      <View style={{ height: coverHeight }}>
        {cover ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.brand.ink }]}>
            {cover}
          </View>
        ) : (
          <AppBrandSurface style={StyleSheet.absoluteFill} />
        )}
        <View style={[styles.coverBar, { top: topInset + 8, left: gutter - 4, right: gutter - 4 }]}>
          <AppIconButton
            accessibilityLabel="Go back"
            variant="overlay"
            icon={
              <ChevronLeft size={24} color={theme.colors.contrast.onOverlay} strokeWidth={2.2} />
            }
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
          <View style={styles.coverActions}>
            <AppIconButton
              accessibilityLabel={`Share ${p.businessName}`}
              variant="overlay"
              icon={<Share2 size={19} color={theme.colors.contrast.onOverlay} strokeWidth={2.2} />}
              onPress={() =>
                void shareProvider(p.slug, p.businessName).catch((error: unknown) =>
                  toast(errorMessage(error), "error"),
                )
              }
            />
            <FavoriteButton
              providerId={p.id}
              businessName={p.businessName}
              isFavorite={p.isFavorite}
              variant="overlay"
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.background.elevated,
            borderTopLeftRadius: theme.radius["3xl"],
            borderTopRightRadius: theme.radius["3xl"],
            paddingHorizontal: gutter,
            paddingBottom: theme.spacing[5],
            gap: theme.spacing[3],
          },
        ]}
      >
        <View style={styles.inner}>
          <View style={styles.logo}>
            <AppAvatar
              name={p.businessName}
              uri={p.logoUrl}
              size={84}
              shape="rounded"
              ringColor={theme.colors.background.elevated}
            />
          </View>
          <View style={{ gap: theme.spacing[1] }}>
            <View style={styles.nameRow}>
              <AppText variant="title" style={styles.shrink} accessibilityRole="header">
                {p.businessName}
              </AppText>
              {p.verificationStatus === "verified" ? (
                <BadgeCheck
                  size={24}
                  color={theme.colors.contrast.onInk}
                  fill={theme.colors.brand.primary}
                  accessibilityLabel="Verified"
                />
              ) : null}
            </View>
            <AppText tone="secondary">
              {p.primaryCategory?.name ?? "Local service"}
              {p.subcategories.length ? ` · ${p.subcategories.slice(0, 3).join(", ")}` : ""}
            </AppText>
            {place ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color={theme.colors.text.tertiary} strokeWidth={2.2} />
                <AppText variant="caption" tone="secondary">
                  {place}
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={[styles.badges, { marginTop: theme.spacing[3] }]}>
            <AppBadge
              dot
              label={p.isOpenNow ? `Open now · ${p.todayHours}` : `Closed now · ${p.todayHours}`}
              tone={p.isOpenNow ? "success" : "neutral"}
            />
            {p.verificationStatus === "verified" ? (
              <AppBadge icon={BadgeCheck} label="Verified" tone="brand" />
            ) : null}
            {p.planTier ? (
              <AppBadge
                label={p.planTier === "business" ? "Business Partner" : "Pro Partner"}
                tone="accent"
              />
            ) : null}
            {p.badges.map((b) => (
              <AppBadge key={b.id} label={b.name} tone="warning" />
            ))}
          </View>
          <View style={{ marginTop: theme.spacing[4] }}>
            <AppStatRow stats={stats} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverActions: { flexDirection: "row", gap: 8 },
  coverBar: { flexDirection: "row", justifyContent: "space-between", position: "absolute" },
  panel: { borderCurve: "continuous", marginTop: -28 },
  inner: { alignSelf: "center", maxWidth: 1040, width: "100%" },
  logo: { alignSelf: "flex-start", marginBottom: 12, marginTop: -44 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  shrink: { flexShrink: 1 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 4, marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
