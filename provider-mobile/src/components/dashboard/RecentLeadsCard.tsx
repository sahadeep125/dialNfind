import { StyleSheet, View } from "react-native";

import { AppCard, AppDivider, AppText } from "@/components/design-system";
import { SectionHeader } from "@/components/layout";
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { useTheme } from "@/hooks/useTheme";
import type { DashboardRecentLead } from "@/types/dashboard";
import { formatRelative } from "@/utils/format";

interface Props {
  leads: DashboardRecentLead[];
  onViewAll: () => void;
}

export function RecentLeadsCard({ leads, onViewAll }: Props) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[2] }}>
        <SectionHeader title="Recent leads" actionLabel="View all" onAction={onViewAll} />
        {leads.length === 0 ? (
          <AppText tone="secondary" style={{ paddingVertical: theme.spacing[4] }} align="center">
            No leads yet. Complete your profile to rank higher.
          </AppText>
        ) : (
          leads.map((l, i) => (
            <View key={l.id}>
              {i > 0 ? <AppDivider /> : null}
              <View
                style={[styles.row, { gap: theme.spacing[3], paddingVertical: theme.spacing[3] }]}
              >
                <ChannelIcon channel={l.channel} />
                <View style={styles.main}>
                  <AppText variant="label" numberOfLines={1}>
                    {l.customerName}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {l.channel === "call" ? "Tapped Call" : "Opened WhatsApp"}
                    {l.service ? ` · ${l.service}` : ""}
                  </AppText>
                </View>
                <AppText variant="caption" tone="tertiary">
                  {formatRelative(l.createdAt)}
                </AppText>
              </View>
            </View>
          ))
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
});
