import { StyleSheet, View } from "react-native";
import { PhoneIncoming } from "lucide-react-native";

import { AppPressable, AppSection, AppText } from "@/components/design-system";
import { EmptyState } from "@/components/layout";
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { useTheme } from "@/hooks/useTheme";
import type { DashboardRecentLead } from "@/types/dashboard";
import { formatRelative } from "@/utils/format";

interface Props {
  leads: DashboardRecentLead[];
  onViewAll: () => void;
}

/** The latest people who reached out. Tapping one opens Leads, where you call back or follow up. */
export function RecentLeadsCard({ leads, onViewAll }: Props) {
  const theme = useTheme();
  const shown = leads.slice(0, 4);
  return (
    <AppSection
      title="Recent leads"
      action={{ label: "See all", onPress: onViewAll }}
      dividerInset={14 + 32 + 12}
    >
      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={PhoneIncoming}
          title="No leads yet"
          text="They show up here the moment a customer taps Call or WhatsApp."
        />
      ) : (
        shown.map((l) => (
          <AppPressable
            key={l.id}
            accessibilityRole="button"
            accessibilityLabel={`${l.customerName}, ${l.service ?? "general enquiry"}, ${formatRelative(l.createdAt)}`}
            onPress={onViewAll}
            scale={false}
          >
            <View
              style={[
                styles.row,
                {
                  gap: theme.spacing[3],
                  paddingHorizontal: 14,
                  paddingVertical: theme.spacing[2.5],
                },
              ]}
            >
              <ChannelIcon channel={l.channel} size={32} />
              <View style={styles.main}>
                <View style={[styles.row, { gap: 4 }]}>
                  <AppText variant="label" numberOfLines={1} style={styles.shrink}>
                    {l.customerName}
                  </AppText>
                </View>
                <AppText variant="meta" tone="secondary" numberOfLines={1}>
                  {l.service ?? "General enquiry"}
                </AppText>
              </View>
              <AppText variant="meta" numeric>
                {formatRelative(l.createdAt)}
              </AppText>
            </View>
          </AppPressable>
        ))
      )}
    </AppSection>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  main: { flex: 1, gap: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
});
