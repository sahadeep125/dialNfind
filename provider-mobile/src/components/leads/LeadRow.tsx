import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Flag, Lock, MessageCircle, Phone } from "lucide-react-native";

import { AppBadge, AppButton, AppCard, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Lead } from "@/types/leads";
import { formatRelative } from "@/utils/format";
import { ChannelIcon } from "./ChannelIcon";
import { LeadOutcome } from "./LeadOutcome";

const SOURCE_LABEL: Record<string, string> = {
  search: "Search results",
  profile: "Your profile",
  category_browse: "Category page",
  ai_match: "Smart match",
};

const DISPUTE_DAYS = 30;
const DISPUTE_LABEL = { open: "Reported, under review", accepted: "Report accepted", rejected: "Report not accepted" } as const;

interface Props {
  lead: Lead;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onReport: (lead: Lead) => void;
}

export const LeadRow = memo(function LeadRow({ lead, onCall, onWhatsApp, onReport }: Props) {
  const canReport = lead.disputeStatus === "none" && Date.now() - new Date(lead.createdAt).getTime() <= DISPUTE_DAYS * 86_400_000;
  const theme = useTheme();
  const phone = lead.customerPhone;
  const details = lead.details.map((d) => `${d.label}: ${d.value}`).join(" · ");
  return (
    <AppCard padding={theme.spacing[4]}>
      <View style={[styles.top, { gap: theme.spacing[3] }]}>
        <ChannelIcon channel={lead.channel} />
        <View style={styles.main}>
          <View style={[styles.nameRow, { gap: theme.spacing[2] }]}>
            {lead.locked ? <Lock size={14} color={theme.colors.brand.primary} /> : null}
            <AppText variant="label" numberOfLines={1} style={[styles.shrink, lead.locked ? { color: theme.colors.brand.primary } : null]}>
              {lead.customerName}
            </AppText>
            {lead.isGuest ? (
              <AppText variant="caption" tone="tertiary">
                not signed in
              </AppText>
            ) : null}
          </View>
          <AppText variant="caption" tone="secondary">
            {lead.channel === "call" ? "Call" : "WhatsApp"} · {formatRelative(lead.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={[{ gap: theme.spacing[1], marginTop: theme.spacing[3] }]}>
        <AppText variant="body" tone={lead.service ? "primary" : "secondary"}>
          {lead.service ?? "General enquiry"}
        </AppText>
        {lead.description ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {lead.description}
          </AppText>
        ) : null}
        {details ? (
          <AppText variant="caption" tone="secondary">
            {details}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.footer, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
        <AppText variant="caption" tone="tertiary" style={styles.shrink} numberOfLines={1}>
          From {SOURCE_LABEL[lead.source] ?? lead.source}
        </AppText>
        <LeadOutcome lead={lead} />
      </View>

      {lead.locked ? (
        <AppButton
          size="sm"
          variant="soft"
          leadingIcon={<Lock size={14} color={theme.colors.brand.softText} />}
          onPress={() => router.push({ pathname: "/paywall", params: { feature: "leads" } })}
          style={{ marginTop: theme.spacing[3] }}
        >
          Upgrade to see this contact
        </AppButton>
      ) : null}

      {lead.disputeStatus !== "none" ? (
        <View style={{ marginTop: theme.spacing[2] }}>
          <AppBadge label={DISPUTE_LABEL[lead.disputeStatus]} tone="neutral" />
        </View>
      ) : canReport ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={`Report the contact from ${lead.customerName}`}
          hitSlop={8}
          onPress={() => onReport(lead)}
          style={[styles.report, { gap: theme.spacing[1], marginTop: theme.spacing[2] }]}
        >
          <Flag size={14} color={theme.colors.text.tertiary} />
          <AppText variant="caption" tone="tertiary">
            Report spam or wrong number
          </AppText>
        </AppPressable>
      ) : null}

      {phone ? (
        <View style={[styles.actions, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
          <AppButton
            variant="soft"
            size="sm"
            leadingIcon={<Phone size={16} color={theme.colors.brand.softText} />}
            onPress={() => onCall(phone)}
            style={styles.action}
          >
            Call back
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            leadingIcon={<MessageCircle size={16} color={theme.colors.semantic.success} />}
            onPress={() => onWhatsApp(phone)}
            style={styles.action}
          >
            WhatsApp
          </AppButton>
        </View>
      ) : null}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  top: { alignItems: "center", flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: "center", flexDirection: "row" },
  shrink: { flexShrink: 1 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actions: { flexDirection: "row", flexWrap: "wrap" },
  action: { flexGrow: 1 },
  report: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row" },
});
