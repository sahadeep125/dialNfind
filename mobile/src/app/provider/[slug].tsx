import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Globe, Mail, MapPin, PenLine, SearchX } from "lucide-react-native";

import {
  AppButton,
  AppChip,
  AppDivider,
  AppListItem,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { PhotoViewer, type ViewerPhoto } from "@/components/photos/PhotoViewer";
import {
  ContactButtons,
  DetailSection,
  HoursList,
  PortfolioStrip,
  ProviderCard,
  ProviderHero,
  RatingBreakdown,
  ReportSheet,
  ReviewItem,
} from "@/components/providers";
import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useProvider } from "@/hooks/useProvider";
import { useProviderReviews } from "@/hooks/useProviderReviews";
import type { ReportTarget } from "@/hooks/useReport";
import { useSimilarProviders } from "@/hooks/useSimilarProviders";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { openEmail, openMaps, openUrl } from "@/services/links";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDate, formatPrice } from "@/utils/format";

export default function ProviderScreen() {
  const theme = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const signedIn = useAuthStore((s) => !!s.token);
  const { data: p, isLoading, isError, error, refetch } = useProvider(slug);
  const reviews = useProviderReviews(slug);
  const similar = useSimilarProviders(slug);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null);
  const reviewList = useMemo(
    () => reviews.data?.pages.flatMap((page) => page.reviews) ?? [],
    [reviews.data],
  );

  const writeReview = (): void => {
    if (!signedIn) {
      toast("Sign in to write a review", "info");
      router.push("/login");
      return;
    }
    router.push(`/review/${slug}`);
  };

  const open = async (action: () => Promise<void>): Promise<void> => {
    try {
      await action();
    } catch (err: unknown) {
      toast(errorMessage(err), "error");
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          <AppSkeleton shape="block" height={160} />
          <AppSkeleton width="70%" height={24} />
          <AppSkeleton width="45%" />
          <AppSkeleton shape="block" height={120} />
        </View>
      </Screen>
    );
  }

  if (isError || !p) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <Screen>
        <ScreenHeader />
        {missing ? (
          <EmptyState
            icon={SearchX}
            title="Provider not found"
            text="This listing may have been removed or renamed."
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <ProviderHero provider={p} topInset={insets.top} />
        <View style={[styles.sections, { padding: theme.spacing[4], gap: theme.spacing[4] }]}>
          {p.description || p.shortDescription ? (
            <DetailSection title="About">
              <AppText tone="secondary">{p.description || p.shortDescription}</AppText>
              <AppText variant="caption" tone="tertiary">
                On DialNFind since {formatDate(p.memberSince)}
                {p.selfReportedCompletedJobs ? ` · ${p.selfReportedCompletedJobs}+ jobs done` : ""}
              </AppText>
            </DetailSection>
          ) : null}

          {p.services.length ? (
            <DetailSection title="Services and prices">
              {p.services.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <AppDivider style={{ marginBottom: theme.spacing[2] }} /> : null}
                  <View style={styles.serviceRow}>
                    <AppText style={styles.flex}>{s.subcategory?.name ?? s.category.name}</AppText>
                    <AppText variant="label" tone={s.startingPrice ? "primary" : "tertiary"}>
                      {formatPrice(s.startingPrice, s.priceUnit) ?? "Ask for quote"}
                    </AppText>
                  </View>
                </View>
              ))}
            </DetailSection>
          ) : null}

          {p.serviceDetails.length ? (
            <DetailSection title="Details">
              {p.serviceDetails.map((d) => (
                <View key={d.label} style={styles.serviceRow}>
                  <AppText tone="secondary" style={styles.flex}>
                    {d.label}
                  </AppText>
                  <AppText variant="label" style={styles.detailValue}>
                    {d.value}
                  </AppText>
                </View>
              ))}
            </DetailSection>
          ) : null}

          <DetailSection title="Opening hours">
            <HoursList hours={p.hours} is24x7={p.is24x7} />
          </DetailSection>

          {p.serviceAreas.length ? (
            <DetailSection title="Areas served">
              <View style={styles.chips}>
                {p.serviceAreas.map((a) => (
                  <AppChip key={a.areaName} size="sm" label={a.areaName} />
                ))}
              </View>
              <AppText variant="caption" tone="tertiary">
                Travels up to {p.serviceRadiusKm} km
              </AppText>
            </DetailSection>
          ) : null}

          {p.portfolio.length ? (
            <DetailSection title="Past work">
              <PortfolioStrip
                items={p.portfolio}
                onOpen={(index) =>
                  setViewer({ photos: p.portfolio.map((i) => ({ uri: i.imageUrl, caption: i.title })), index })
                }
              />
            </DetailSection>
          ) : null}

          {p.addressLine || p.email || p.website ? (
            <DetailSection title="Contact details">
              {p.addressLine ? (
                <AppListItem
                  title={p.addressLine}
                  subtitle={[p.locality, p.city, p.pincode].filter(Boolean).join(", ")}
                  leading={<MapPin size={18} color={theme.colors.brand.primary} />}
                  onPress={() =>
                    void open(() => openMaps(p.latitude, p.longitude, `${p.businessName}, ${p.addressLine}`))
                  }
                />
              ) : null}
              {p.email ? (
                <AppListItem
                  title={p.email}
                  leading={<Mail size={18} color={theme.colors.brand.primary} />}
                  onPress={() =>
                    void open(() => openEmail(p.email ?? "", "Enquiry from DialNFind"))
                  }
                />
              ) : null}
              {p.website ? (
                <AppListItem
                  title={p.website.replace(/^https?:\/\//, "")}
                  leading={<Globe size={18} color={theme.colors.brand.primary} />}
                  onPress={() => void open(() => openUrl(p.website ?? ""))}
                />
              ) : null}
            </DetailSection>
          ) : null}

          <DetailSection
            title="Reviews"
            action={
              <AppButton
                size="sm"
                variant="soft"
                leadingIcon={<PenLine size={15} color={theme.colors.brand.softText} />}
                onPress={writeReview}
              >
                {p.myReview ? "Edit review" : "Write a review"}
              </AppButton>
            }
          >
            <RatingBreakdown
              rating={p.avgRating}
              total={p.totalReviews}
              breakdown={p.ratingBreakdown}
            />
            {reviewList.map((r) => (
              <View key={r.id} style={{ gap: theme.spacing[3] }}>
                <AppDivider />
                <ReviewItem
                  review={r}
                  onReport={(review) =>
                    setReporting({ kind: "review", id: review.id, name: review.author.name })
                  }
                  onOpenPhoto={(review, index) =>
                    setViewer({
                      photos: review.photos.map((uri) => ({ uri, caption: `From ${review.author.name}` })),
                      index,
                    })
                  }
                />
              </View>
            ))}
            {reviews.isLoading ? <ActivityIndicator color={theme.colors.brand.primary} /> : null}
            {reviews.isError && !reviewList.length ? (
              <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />
            ) : null}
            {!reviews.isLoading && !reviews.isError && !reviewList.length ? (
              <AppText tone="secondary">
                No reviews yet. Be the first to share your experience.
              </AppText>
            ) : null}
            {reviews.hasNextPage ? (
              <AppButton
                variant="secondary"
                loading={reviews.isFetchingNextPage}
                onPress={() => void reviews.fetchNextPage()}
              >
                Show more reviews
              </AppButton>
            ) : null}
          </DetailSection>

          {similar.data?.length ? (
            <DetailSection title="Similar providers nearby">
              <View style={{ gap: theme.spacing[3] }}>
                {similar.data.map((s) => (
                  <ProviderCard key={s.id} provider={s} source="profile" />
                ))}
              </View>
            </DetailSection>
          ) : null}

          <AppButton
            variant="ghost"
            size="sm"
            leadingIcon={<Flag size={14} color={theme.colors.text.secondary} />}
            onPress={() => setReporting({ kind: "provider", slug: p.slug, name: p.businessName })}
            style={styles.reportListing}
          >
            Report this listing
          </AppButton>
        </View>
      </ScrollView>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
      <PhotoViewer photos={viewer?.photos ?? []} index={viewer?.index ?? null} onClose={() => setViewer(null)} />
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing[3]),
            backgroundColor: theme.colors.background.elevated,
            borderTopColor: theme.colors.border.primary,
          },
        ]}
      >
        <View style={styles.bottomInner}>
          <ContactButtons provider={p} source="profile" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { alignSelf: "center", maxWidth: MAX_CONTENT_WIDTH, width: "100%" },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  detailValue: { flexShrink: 1, textAlign: "right" },
  flex: { flex: 1 },
  reportListing: { alignSelf: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  bottomInner: { alignSelf: "center", maxWidth: MAX_CONTENT_WIDTH, width: "100%" },
});
