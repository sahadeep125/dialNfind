import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Store } from "lucide-react-native";

import { AppBrandSurface, AppText } from "@/components/design-system";
import {
  CategoryGrid,
  HomeHeader,
  HomeStickyBar,
  PopularChips,
  RecentContacts,
  SearchLauncher,
  TrustStrip,
} from "@/components/home";
import { EmptyState, ErrorState, FocusStatusBar, Screen, SectionHeader } from "@/components/layout";
import { ProviderMiniCard, ProviderMiniCardSkeleton } from "@/components/providers";
import { MAX_GRID_WIDTH } from "@/constants/spacing";
import { useCategories } from "@/hooks/useCategories";
import { useContacts } from "@/hooks/useContacts";
import { useFeaturedProviders } from "@/hooks/useFeaturedProviders";
import { useLayout } from "@/hooks/useLayout";
import { usePopularSearches } from "@/hooks/usePopularSearches";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";

/** Height of the sticky bar's content under the status bar. */
const STICKY_BAR = 52;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter, width } = useLayout();
  // The header runs edge to edge; everything else keeps to the grid width on big tablets.
  const pad = Math.max(gutter, (width - MAX_GRID_WIDTH) / 2);
  const cardWidth = Math.min(300, Math.round((width - pad * 2) * 0.78));
  const city = useLocationStore((s) => s.location.city || s.location.name);
  const categories = useCategories();
  const featured = useFeaturedProviders();
  const popular = usePopularSearches();
  const contacts = useContacts();
  const signedIn = useAuthStore((s) => !!s.token);
  const refreshing = (categories.isRefetching || featured.isRefetching) && !featured.isLoading;

  // Once the brand header has scrolled under the status bar, the compact sticky bar takes over.
  const [heroHeight, setHeroHeight] = useState(0);
  // Until the header is measured, keep the bar out of reach.
  const threshold = heroHeight ? Math.max(1, heroHeight - insets.top - STICKY_BAR) : 100000;
  const [condensed, setCondensed] = useState(false);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  useAnimatedReaction(
    () => scrollY.value >= threshold - 24,
    (now, before) => {
      if (now !== before) scheduleOnRN(setCondensed, now);
    },
    [threshold],
  );
  // Fills the pull-to-refresh overscroll above the header with the brand color instead of the canvas.
  const backdrop = useAnimatedStyle(() => ({ height: scrollY.value < 0 ? 2 - scrollY.value : 0 }));
  const onHeroLayout = useCallback(
    (e: LayoutChangeEvent) => setHeroHeight(e.nativeEvent.layout.height),
    [],
  );

  const refresh = useCallback(() => {
    void categories.refetch();
    void featured.refetch();
    void popular.refetch();
    if (signedIn) void contacts.refetch();
  }, [categories, featured, popular, contacts, signedIn]);

  return (
    <Screen edges={[]} width="full">
      <FocusStatusBar style={condensed && theme.mode === "light" ? "dark" : "light"} />
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { backgroundColor: theme.colors.brand.inkSoft }, backdrop]}
      />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing[8], paddingBottom: theme.spacing[10] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.contrast.onInk}
            progressViewOffset={insets.top}
          />
        }
      >
        <AppBrandSurface
          style={{
            paddingTop: insets.top + theme.spacing[2],
            paddingHorizontal: pad,
            paddingBottom: theme.spacing[5],
            borderBottomLeftRadius: theme.radius["2xl"],
            borderBottomRightRadius: theme.radius["2xl"],
          }}
        >
          <View onLayout={onHeroLayout} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <HomeHeader />
          <View style={[styles.headline, { gap: theme.spacing[1], marginTop: theme.spacing[6] }]}>
            <AppText variant="title" tone="white" accessibilityRole="header">
              Find trusted help nearby
            </AppText>
            <AppText variant="caption" tone="whiteMuted" numberOfLines={1}>
              Call or WhatsApp local pros directly. No booking fees.
            </AppText>
          </View>
          <View style={{ marginTop: theme.spacing[5], gap: theme.spacing[3] }}>
            <SearchLauncher />
            <PopularChips inset={pad} />
          </View>
        </AppBrandSurface>

        <View style={{ paddingHorizontal: pad, gap: theme.spacing[4] }}>
          <SectionHeader title="Browse categories" subtitle="Pick a service to see pros nearby" />
          {categories.isError ? (
            <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
          ) : (
            <CategoryGrid categories={categories.data} loading={categories.isLoading} rows={2} />
          )}
        </View>

        <RecentContacts inset={pad} />

        <View style={{ gap: theme.spacing[4] }}>
          <View style={{ paddingHorizontal: pad }}>
            <SectionHeader
              title="Top rated near you"
              subtitle={city ? `Popular providers around ${city}` : undefined}
              actionLabel="View all"
              onAction={() => router.push({ pathname: "/search", params: { sort: "rating" } })}
            />
          </View>
          {featured.isLoading ? (
            <FlatList
              horizontal
              scrollEnabled={false}
              data={[0, 1, 2]}
              keyExtractor={String}
              renderItem={() => <ProviderMiniCardSkeleton width={cardWidth} />}
              contentContainerStyle={{ paddingHorizontal: pad, gap: theme.spacing[3] }}
              showsHorizontalScrollIndicator={false}
            />
          ) : featured.isError ? (
            <View style={{ paddingHorizontal: pad }}>
              <ErrorState error={featured.error} onRetry={() => void featured.refetch()} />
            </View>
          ) : featured.data?.length ? (
            <FlatList
              horizontal
              data={featured.data}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <ProviderMiniCard provider={item} width={cardWidth} />}
              contentContainerStyle={{
                paddingHorizontal: pad,
                paddingVertical: theme.spacing[1],
                gap: theme.spacing[3],
              }}
              snapToInterval={cardWidth + theme.spacing[3]}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <View style={{ paddingHorizontal: pad }}>
              <EmptyState
                icon={Store}
                title="No providers here yet"
                text="Try another area from the location menu at the top."
              />
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: pad }}>
          <TrustStrip />
        </View>
      </Animated.ScrollView>

      <HomeStickyBar scrollY={scrollY} threshold={threshold} pad={pad} visible={condensed} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { left: 0, position: "absolute", right: 0, top: 0 },
  headline: { maxWidth: 560 },
});
