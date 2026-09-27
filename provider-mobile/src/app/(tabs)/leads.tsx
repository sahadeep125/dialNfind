import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { PhoneIncoming, Search } from "lucide-react-native";

import {
  AppChip,
  AppChipDivider,
  AppChipRow,
  AppDivider,
  AppInput,
} from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { PlanBanner } from "@/components/subscription/PlanBanner";
import { LeadRow } from "@/components/leads/LeadRow";
import { LeadRowSkeleton } from "@/components/leads/LeadRowSkeleton";
import { ReportLeadSheet } from "@/components/leads/ReportLeadSheet";
import { LeadActionsSheet } from "@/components/leads/LeadActionsSheet";
import { LEAD_STATUS_OPTIONS, isReportable } from "@/components/leads/leadStatus";
import { useDebounce } from "@/hooks/useDebounce";
import { useLeads } from "@/hooks/useLeads";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openPhone, openWhatsApp } from "@/services/links";
import type { Lead, LeadFilter, LeadStatus } from "@/types/leads";
import { plural } from "@/utils/format";

const FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "call", label: "Calls" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function LeadsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const [channel, setChannel] = useState<LeadFilter>("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim());
  const [reporting, setReporting] = useState<Lead | null>(null);
  const [managing, setManaging] = useState<Lead | null>(null);
  const {
    data,
    error,
    isLoading,
    isError,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useLeads({ channel, status, q });
  const filtered = channel !== "all" || status !== "all" || q !== "";

  const leads = useMemo(() => data?.pages.flatMap((p) => p.leads) ?? [], [data]);
  const total = data?.pages[0]?.total;

  const onCall = useCallback(
    (phone: string) => {
      openPhone(phone).catch((e: unknown) => toast(errorMessage(e), "error"));
    },
    [toast],
  );
  const onWhatsApp = useCallback(
    (phone: string) => {
      openWhatsApp(phone).catch((e: unknown) => toast(errorMessage(e), "error"));
    },
    [toast],
  );

  const count = leads.length;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Lead>) => {
      const first = index === 0;
      const last = index === count - 1;
      return (
        <View
          style={[
            styles.item,
            {
              backgroundColor: theme.colors.background.elevated,
              borderColor: theme.colors.border.primary,
              borderTopWidth: first ? 1 : 0,
              borderBottomWidth: last ? 1 : 0,
              borderTopLeftRadius: first ? theme.radius.lg : 0,
              borderTopRightRadius: first ? theme.radius.lg : 0,
              borderBottomLeftRadius: last ? theme.radius.lg : 0,
              borderBottomRightRadius: last ? theme.radius.lg : 0,
            },
          ]}
        >
          {first ? null : <AppDivider inset={14 + 36 + 12} />}
          <LeadRow
            lead={item}
            onCall={onCall}
            onWhatsApp={onWhatsApp}
            onReport={setReporting}
            onManage={setManaging}
          />
        </View>
      );
    },
    [onCall, onWhatsApp, count, theme],
  );

  const header = (
    <View style={{ gap: theme.spacing[3], marginBottom: theme.spacing[3] }}>
      <PlanBanner />
      <AppInput
        size="sm"
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, service or message"
        accessibilityLabel="Search leads"
        autoCorrect={false}
        returnKeyType="search"
        maxLength={100}
        leadingIcon={<Search size={16} color={theme.colors.text.tertiary} />}
      />
      <AppChipRow>
        {FILTERS.map((f) => (
          <AppChip
            key={f.value}
            label={f.label}
            selected={channel === f.value}
            onPress={() => setChannel(f.value)}
          />
        ))}
        <AppChipDivider />
        {[{ value: "all" as const, label: "Any status" }, ...LEAD_STATUS_OPTIONS].map((f) => (
          <AppChip
            key={f.value}
            label={f.label}
            selected={status === f.value}
            onPress={() => setStatus(f.value)}
          />
        ))}
      </AppChipRow>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        variant="large"
        title="Leads"
        subtitle={
          total !== undefined && !isError
            ? `${plural(total, "customer")} contacted you`
            : "Customers who tapped Call or WhatsApp"
        }
      />
      <FlatList
        data={isLoading || isError ? [] : leads}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing[1] },
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <View
              style={[
                styles.skeleton,
                {
                  backgroundColor: theme.colors.background.elevated,
                  borderColor: theme.colors.border.primary,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <LeadRowSkeleton />
              <LeadRowSkeleton />
              <LeadRowSkeleton />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : filtered ? (
            <EmptyState
              icon={Search}
              title="No leads match"
              text="Try a different status or search."
            />
          ) : (
            <EmptyState
              icon={PhoneIncoming}
              title="No leads yet"
              text="Complete your profile and add prices to appear higher in search. Leads show up here the moment a customer contacts you."
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.brand.primary} style={styles.footer} />
          ) : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
        initialNumToRender={8}
        windowSize={9}
      />
      <ReportLeadSheet lead={reporting} onClose={() => setReporting(null)} />
      <LeadActionsSheet
        lead={managing}
        onClose={() => setManaging(null)}
        onReport={managing && isReportable(managing) ? setReporting : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  item: { overflow: "hidden" },
  skeleton: { borderWidth: 1, overflow: "hidden" },
  footer: { paddingVertical: 16 },
});
