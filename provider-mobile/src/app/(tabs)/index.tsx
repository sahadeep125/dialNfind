import { useCallback, useState } from "react";
import { router, type Href } from "expo-router";
import { Eye, MessageSquareText, Percent, Star, Trophy } from "lucide-react-native";

import { AppNotice, AppStat, AppStatGrid } from "@/components/design-system";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { CompletenessCard } from "@/components/dashboard/CompletenessCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RecentLeadsCard } from "@/components/dashboard/RecentLeadsCard";
import { RecentReviewsCard } from "@/components/dashboard/RecentReviewsCard";
import { PlanBanner, usePlanNeedsNotice } from "@/components/subscription/PlanBanner";
import { ErrorState, Screen, ScreenScroll } from "@/components/layout";
import { useDashboard } from "@/hooks/useDashboard";
import { useLayout } from "@/hooks/useLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import type { Dashboard, DashboardDays } from "@/types/dashboard";
import type { ProviderStatus } from "@/types";

const count = (n: number): string => n.toLocaleString("en-IN");

/** At most one notice: the most urgent thing the provider should act on right now. */
function Attention({ status, data }: { status: ProviderStatus; data?: Dashboard }) {
  const planNotice = usePlanNeedsNotice();
  if (status === "pending")
    return (
      <AppNotice
        tone="warning"
        title="Your listing is in review"
        text="It appears in search once our team has checked it."
      />
    );
  if (status === "rejected" || status === "suspended")
    return (
      <AppNotice
        tone="danger"
        title={
          status === "rejected" ? "Your listing was not approved" : "Your listing is suspended"
        }
        text="Talk to our team to fix it."
        actionLabel="Get help"
        onPress={() => router.push("/support")}
      />
    );
  if (planNotice) return <PlanBanner />;
  const unreplied = data?.totals.unrepliedReviews ?? 0;
  if (unreplied > 0)
    return (
      <AppNotice
        tone="info"
        icon={MessageSquareText}
        title={`${unreplied} ${unreplied === 1 ? "review needs" : "reviews need"} a reply`}
        text="Replying builds trust with new customers."
        actionLabel="Reply"
        onPress={() => router.push("/reviews")}
      />
    );
  return null;
}

export default function DashboardScreen() {
  const { isTablet } = useLayout();
  const [days, setDays] = useState<DashboardDays>(30);
  const dashboard = useDashboard(days);
  const notifications = useNotifications();
  const session = useSession();
  const profile = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const { data, error, isError, refetch } = dashboard;

  const sessionProvider = session.data?.state.provider;
  const businessName = data?.provider.businessName ?? sessionProvider?.businessName ?? "";
  const status = data?.provider.status ?? sessionProvider?.status ?? "active";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), notifications.refetch()]);
    setRefreshing(false);
  }, [refetch, notifications]);

  const open = useCallback((path: string) => router.push(path as Href), []);
  const unlock = useCallback(
    () => router.push({ pathname: "/paywall", params: { feature: "analytics" } }),
    [],
  );

  return (
    <Screen>
      <ScreenScroll refreshing={refreshing} onRefresh={() => void onRefresh()}>
        <DashboardHeader
          businessName={businessName}
          logoUrl={profile.data?.logoUrl ?? null}
          status={status}
          unread={notifications.data?.unread ?? 0}
          onOpenNotifications={() => router.push("/notifications")}
        />

        <Attention status={status} data={data} />

        {data ? (
          <>
            <DashboardHero
              days={days}
              onDaysChange={setDays}
              leads={data.totals.leads}
              calls={data.totals.calls}
              whatsapp={data.totals.whatsapp}
              change={data.analyticsLocked ? null : data.totals.leadsChangePct}
              isAvailable={status === "active" ? data.provider.isAvailable : null}
            />

            <AppStatGrid columns={isTablet ? 4 : 2}>
              <AppStat
                label="Profile views"
                icon={Eye}
                value={data.totals.views !== null ? count(data.totals.views) : "-"}
                change={data.totals.viewsChangePct}
                hint={
                  data.totals.impressions !== null
                    ? `${count(data.totals.impressions)} in search`
                    : undefined
                }
                locked={data.totals.views === null}
                onPress={data.totals.views === null ? unlock : undefined}
              />
              <AppStat
                label="View to lead"
                icon={Percent}
                value={data.totals.conversionPct !== null ? `${data.totals.conversionPct}%` : "-"}
                hint="Tapped Call or WhatsApp"
                locked={data.analyticsLocked}
                onPress={data.analyticsLocked ? unlock : undefined}
              />
              <AppStat
                label="Rating"
                icon={Star}
                value={data.provider.totalReviews ? data.provider.avgRating.toFixed(1) : "-"}
                hint={`${count(data.provider.totalReviews)} reviews`}
                onPress={() => router.push("/reviews")}
              />
              <AppStat
                label={`Rank in ${data.provider.city}`}
                icon={Trophy}
                value={data.ranking ? `#${data.ranking.position}` : "-"}
                hint={
                  data.ranking
                    ? `of ${count(data.ranking.outOf)} in category`
                    : "Complete your profile"
                }
              />
            </AppStatGrid>

            <CompletenessCard
              pct={data.provider.profileCompletenessPct}
              checklist={data.checklist}
              onOpen={open}
            />

            {data.analyticsLocked ? null : <ActivityChart series={data.series} days={days} />}

            <RecentLeadsCard leads={data.recentLeads} onViewAll={() => router.push("/leads")} />

            <RecentReviewsCard
              reviews={data.recentReviews}
              unreplied={data.totals.unrepliedReviews}
              onViewAll={() => router.push("/reviews")}
            />
          </>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <DashboardSkeleton />
        )}
      </ScreenScroll>
    </Screen>
  );
}
