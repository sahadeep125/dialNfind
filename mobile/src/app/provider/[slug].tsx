import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Clock,
  Flag,
  Globe,
  Images,
  Info,
  ListChecks,
  Mail,
  MapPin,
  MapPinned,
  PenLine,
  SearchX,
  Star,
  Tag,
  Users,
} from "lucide-react-native";

import {
  AppButton,
  AppChip,
  AppDivider,
  AppListItem,
  AppSkeleton,
  AppText,
} from "@/components/design-system";
import { EmptyState, ErrorState, FocusStatusBar, Screen, ScreenHeader } from "@/components/layout";
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
import { useLayout } from "@/hooks/useLayout";
import { useProvider } from "@/hooks/useProvider";
import { useProviderReviews } from "@/hooks/useProviderReviews";
import type { ReportTarget } from "@/hooks/useReport";
import { useSimilarProviders } from "@/hooks/useSimilarProviders";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import { track } from "@/services/analytics";
import { openEmail, openMaps, openUrl } from "@/services/links";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDate, formatPrice } from "@/utils/format";

const MAX_PAGE_WIDTH = 1040;

export default function ProviderScreen() {
  const theme = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { gutter, sizeClass } = useLayout();
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
  const viewedId = p?.id;
  useEffect(() => {
    if (!p || viewedId === undefined) return;
    track("provider_viewed", {
      provider_id: p.id,
      provider_slug: p.slug,
      category: p.primaryCategory?.slug ?? null,
      provider_city: p.city,
      avg_rating: p.avgRating,
      total_reviews: p.totalReviews,
      verification_status: p.verificationStatus,
      is_claimed: p.isClaimed,
    });
    // Once per provider shown, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedId]);

  // Large tablets put the practical details (hours, areas, contact) in a side column.
  const split = sizeClass === "expanded";

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
      <Screen edges={[]} width="full">
        <AppSkeleton shape="block" height={200 + insets.top} style={{ borderRadius: 0 }} />
        <View style={{ padding: gutter, gap: theme.spacing[3], marginTop: -40 }}>
          <AppSkeleton shape="block" width={84} height={84} />
          <AppSkeleton width="70%" height={26} />
          <AppSkeleton width="45%" />
          <AppSkeleton shape="block" height={64} />
          <AppSkeleton shape="block" height={140} />
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

  const about =
    p.description || p.shortDescription ? (
      <DetailSection title="About" icon={Info}>
        <AppText tone="secondary" style={styles.reading}>
          {p.description || p.shortDescription}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          On DialNFind since {formatDate(p.memberSince)}
        </AppText>
      </DetailSection>
    ) : null;

  const services = p.services.length ? (
    <DetailSection title="Services and prices" icon={Tag}>
      <View>
        {p.services.map((s, i) => (
          <View key={s.id}>
            {i > 0 ? <AppDivider style={{ marginVertical: theme.spacing[3] }} /> : null}
            <View style={styles.serviceRow}>
              <AppText variant="label" style={styles.flex}>
                {s.subcategory?.name ?? s.category.name}
              </AppText>
              <AppText variant="label" tone={s.startingPrice ? "brand" : "tertiary"}>
                {formatPrice(s.startingPrice, s.priceUnit) ?? "Ask for quote"}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </DetailSection>
  ) : null;

  const details = p.serviceDetails.length ? (
    <DetailSection title="Details" icon={ListChecks}>
      <View style={{ gap: theme.spacing[3] }}>
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
      </View>
    </DetailSection>
  ) : null;

  const hours = (
    <DetailSection title="Opening hours" icon={Clock}>
      <HoursList hours={p.hours} is24x7={p.is24x7} />
    </DetailSection>
  );

  const areas = p.serviceAreas.length ? (
    <DetailSection title="Areas served" icon={MapPinned}>
      <View style={styles.chips}>
        {p.serviceAreas.map((a) => (
          <AppChip key={a.areaName} size="sm" label={a.areaName} />
        ))}
      </View>
      <AppText variant="caption" tone="tertiary">
        Travels up to {p.serviceRadiusKm} km
      </AppText>
    </DetailSection>
  ) : null;

  const portfolio = p.portfolio.length ? (
    <DetailSection title="Past work" icon={Images}>
      <PortfolioStrip
        items={p.portfolio}
        onOpen={(index) =>
          setViewer({
            photos: p.portfolio.map((i) => ({ uri: i.imageUrl, caption: i.title })),
            index,
          })
        }
      />
    </DetailSection>
  ) : null;

  const contact =
    p.addressLine || p.email || p.website ? (
      <DetailSection title="Contact details" icon={MapPin}>
        <View style={{ marginHorizontal: -theme.spacing[5] }}>
          {p.addressLine ? (
            <AppListItem
              inset={theme.spacing[5]}
              title={p.addressLine}
              subtitle={[p.locality, p.city, p.pincode].filter(Boolean).join(", ")}
              leading={<MapPin size={18} color={theme.colors.brand.primary} />}
              onPress={() =>
                void open(() =>
                  openMaps(p.latitude, p.longitude, `${p.businessName}, ${p.addressLine}`),
                )
              }
            />
          ) : null}
          {p.email ? (
            <AppListItem
              inset={theme.spacing[5]}
              title={p.email}
              leading={<Mail size={18} color={theme.colors.brand.primary} />}
              onPress={() => void open(() => openEmail(p.email ?? "", "Enquiry from DialNFind"))}
            />
          ) : null}
          {p.website ? (
            <AppListItem
              inset={theme.spacing[5]}
              title={p.website.replace(/^https?:\/\//, "")}
              leading={<Globe size={18} color={theme.colors.brand.primary} />}
              onPress={() => void open(() => openUrl(p.website ?? ""))}
            />
          ) : null}
        </View>
      </DetailSection>
    ) : null;

  const reviewSection = (
    <DetailSection
      title="Reviews"
      icon={Star}
      action={
        <AppButton size="sm" variant="soft" icon={PenLine} onPress={writeReview}>
          {p.myReview ? "Edit review" : "Write a review"}
        </AppButton>
      }
    >
      <RatingBreakdown rating={p.avgRating} total={p.totalReviews} breakdown={p.ratingBreakdown} />
      {reviewList.map((r) => (
        <View key={r.id} style={{ gap: theme.spacing[4] }}>
          <AppDivider />
          <ReviewItem
            review={r}
            onReport={(review) =>
              setReporting({ kind: "review", id: review.id, name: review.author.name })
            }
            onOpenPhoto={(review, index) =>
              setViewer({
                photos: review.photos.map((uri) => ({
                  uri,
                  caption: `From ${review.author.name}`,
                })),
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
        <AppText tone="secondary">No reviews yet. Be the first to share your experience.</AppText>
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
  );

  const similarSection = similar.data?.length ? (
    <View style={{ gap: theme.spacing[3] }}>
      <View style={[styles.similarHead, { gap: theme.spacing[2] }]}>
        <Users size={18} color={theme.colors.text.secondary} />
        <AppText variant="subheading" accessibilityRole="header">
          Similar providers nearby
        </AppText>
      </View>
      <View style={[split ? styles.similarGrid : null, { gap: theme.spacing[3] }]}>
        {similar.data.map((s) => (
          <View key={s.id} style={split ? styles.similarCell : null}>
            <ProviderCard provider={s} source="profile" />
          </View>
        ))}
      </View>
    </View>
  ) : null;

  const report = (
    <AppButton
      variant="ghost"
      size="sm"
      icon={Flag}
      onPress={() => setReporting({ kind: "provider", slug: p.slug, name: p.businessName })}
      style={styles.reportListing}
    >
      Report this listing
    </AppButton>
  );

  const gap = { gap: theme.spacing[4] };

  return (
    <Screen edges={[]} width="full">
      <FocusStatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <ProviderHero provider={p} topInset={insets.top} />
        <View style={[styles.page, { paddingHorizontal: gutter, paddingTop: theme.spacing[4] }]}>
          {split ? (
            <View style={[styles.columns, { gap: theme.spacing[5] }]}>
              <View style={[styles.main, gap]}>
                {about}
                {services}
                {details}
                {portfolio}
                {reviewSection}
              </View>
              <View style={[styles.side, gap]}>
                {hours}
                {areas}
                {contact}
                {report}
              </View>
            </View>
          ) : (
            <View style={gap}>
              {about}
              {services}
              {hours}
              {details}
              {areas}
              {portfolio}
              {contact}
              {reviewSection}
              {similarSection}
              {report}
            </View>
          )}
          {split && similarSection ? (
            <View style={{ marginTop: theme.spacing[6] }}>{similarSection}</View>
          ) : null}
        </View>
      </ScrollView>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
      <PhotoViewer
        photos={viewer?.photos ?? []}
        index={viewer?.index ?? null}
        onClose={() => setViewer(null)}
      />
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing[3]),
            paddingHorizontal: gutter,
            backgroundColor: theme.colors.background.secondary,
            borderTopColor: theme.colors.border.primary,
          },
          theme.mode === "light" ? styles.barShadow : null,
        ]}
      >
        <View style={styles.bottomInner}>
          <ContactButtons provider={p} source="profile" size="lg" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", maxWidth: MAX_PAGE_WIDTH + 64, width: "100%" },
  columns: { alignItems: "flex-start", flexDirection: "row" },
  main: { flex: 1.6 },
  side: { flex: 1 },
  reading: { lineHeight: 23 },
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
  similarHead: { alignItems: "center", flexDirection: "row" },
  similarGrid: { flexDirection: "row", flexWrap: "wrap" },
  similarCell: { flexBasis: "31%", flexGrow: 1 },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  barShadow: { boxShadow: "0 -6px 24px rgba(15, 24, 40, 0.08)" },
  bottomInner: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
