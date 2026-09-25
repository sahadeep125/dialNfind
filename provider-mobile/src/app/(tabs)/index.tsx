import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router, type Href } from "expo-router";
import { Eye, MessageCircle, Phone, Star } from "lucide-react-native";

import { AppCallout } from "@/components/design-system";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { CompletenessCard } from "@/components/dashboard/CompletenessCard";
import { VerifyEmailCallout } from "@/components/auth/VerifyEmailCallout";
import { LockedCard } from "@/components/subscription/LockedCard";
import { PlanBanner } from "@/components/subscription/PlanBanner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RankingCard } from "@/components/dashboard/RankingCard";
import { RecentLeadsCard } from "@/components/dashboard/RecentLeadsCard";
import { RecentReviewsCard } from "@/components/dashboard/RecentReviewsCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { AppSegmented } from "@/components/forms";
import { ErrorState, Screen } from "@/components/layout";
import { useDashboard } from "@/hooks/useDashboard";
import { useLayout } from "@/hooks/useLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import type { DashboardDays } from "@/types/dashboard";

const RANGES: { value: DashboardDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const count = (n: number): string => n.toLocaleString("en-IN");

export default function DashboardScreen() {
  const theme = useTheme();
  const { isTablet } = useLayout();
  const [days, setDays] = useState<DashboardDays>(30);
  const dashboard = useDashboard(days);
  const notifications = useNotifications();
  const session = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const { data, error, isError, refetch } = dashboard;

  const columns = isTablet ? 4 : 2;
  const sessionProvider = session.data?.state.provider;
  const businessName = data?.provider.businessName ?? sessionProvider?.businessName ?? "";
  const status = data?.provider.status ?? sessionProvider?.status ?? "active";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), notifications.refetch()]);
    setRefreshing(false);
  }, [refetch, notifications]);

  const open = useCallback((path: string) => router.push(path as Href), []);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[4],
          gap: theme.spacing[4],
          paddingBottom: theme.spacing[10],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        <DashboardHeader
          businessName={businessName}
          status={status}
          unread={notifications.data?.unread ?? 0}
          onOpenNotifications={() => router.push("/notifications")}
        />

        <VerifyEmailCallout />
        <PlanBanner />

        <AppSegmented
          options={RANGES}
          value={days}
          onChange={setDays}
          accessibilityLabel="Date range"
        />

        {status === "pending" ? (
          <AppCallout tone="warning" title="Waiting for approval">
            Your listing will appear in search once our team has checked it.
          </AppCallout>
        ) : null}

        {data ? (
          <View style={{ gap: theme.spacing[4] }}>
            <StatGrid columns={columns}>
              <StatCard
                label="Total leads"
                value={count(data.totals.leads)}
                change={data.totals.leadsChangePct}
                icon={Phone}
                tone="brand"
                hint={`${count(data.totals.calls)} calls, ${count(data.totals.whatsapp)} WhatsApp`}
              />
              <StatCard
                label="Profile views"
                value={data.totals.views !== null ? count(data.totals.views) : "Pro"}
                change={data.totals.viewsChangePct}
                icon={Eye}
                tone="accent"
                hint={data.totals.impressions !== null ? `${count(data.totals.impressions)} search impressions` : "Upgrade to see who views you"}
              />
              <StatCard
                label="View to lead rate"
                value={data.analyticsLocked ? "Pro" : data.totals.conversionPct !== null ? `${data.totals.conversionPct}%` : "-"}
                icon={MessageCircle}
                tone="success"
                hint="Visitors who tapped Call or WhatsApp"
              />
              <StatCard
                label="Rating"
                value={data.provider.totalReviews ? data.provider.avgRating.toFixed(1) : "-"}
                icon={Star}
                tone="warning"
                hint={`${count(data.provider.totalReviews)} reviews`}
              />
            </StatGrid>

            {data.analyticsLocked ? <LockedCard feature="analytics" /> : <ActivityChart series={data.series} days={days} />}

            <CompletenessCard
              pct={data.provider.profileCompletenessPct}
              checklist={data.checklist}
              onOpen={open}
            />

            {data.ranking ? (
              <RankingCard position={data.ranking.position} outOf={data.ranking.outOf} city={data.provider.city} />
            ) : null}

            <RecentLeadsCard leads={data.recentLeads} onViewAll={() => router.push("/leads")} />

            <RecentReviewsCard
              reviews={data.recentReviews}
              unreplied={data.totals.unrepliedReviews}
              onViewAll={() => router.push("/reviews")}
            />
          </View>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <DashboardSkeleton columns={columns} />
        )}
      </ScrollView>
    </Screen>
  );
}
