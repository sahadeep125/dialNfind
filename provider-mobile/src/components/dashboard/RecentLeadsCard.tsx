import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Lock, PhoneIncoming } from "lucide-react-native";

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
            accessibilityLabel={
              l.locked
                ? `Locked lead. Upgrade to see this contact`
                : `${l.customerName}, ${l.service ?? "general enquiry"}, ${formatRelative(l.createdAt)}`
            }
            onPress={() =>
              l.locked
                ? router.push({ pathname: "/paywall", params: { feature: "leads" } })
                : onViewAll()
            }
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
                  {l.locked ? <Lock size={12} color={theme.colors.brand.primary} /> : null}
                  <AppText
                    variant="label"
                    numberOfLines={1}
                    style={[styles.shrink, l.locked ? { color: theme.colors.brand.primary } : null]}
                  >
                    {l.customerName}
                  </AppText>
                </View>
                <AppText variant="meta" tone="secondary" numberOfLines={1}>
                  {l.locked ? "Upgrade to see this contact" : (l.service ?? "General enquiry")}
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
