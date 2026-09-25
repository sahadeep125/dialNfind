import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Eye, MousePointerClick, Pause, Play, Wallet } from "lucide-react-native";

import { AppBadge, AppButton, AppCard, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { Campaign } from "@/types/billing";
import { formatDate, formatPrice } from "@/utils/format";

import { CampaignStat } from "./CampaignStat";

interface Props {
  campaign: Campaign;
  onToggle: (campaign: Campaign) => void;
  busy: boolean;
}

/** A campaign has ended once it is completed or its last day is behind us. */
function hasEnded(campaign: Campaign): boolean {
  const today = new Date(new Date().toDateString());
  return campaign.status === "completed" || new Date(campaign.endDate) < today;
}

export const CampaignCard = memo(function CampaignCard({ campaign, onToggle, busy }: Props) {
  const theme = useTheme();
  const ended = hasEnded(campaign);
  const running = !ended && campaign.status === "active";
  const iconColor = theme.colors.text.primary;
  const spentPct = (campaign.amountSpent / Math.max(1, campaign.budget)) * 100;

  return (
    <AppCard>
      <View style={{ gap: theme.spacing[4] }}>
        <View style={[styles.top, { gap: theme.spacing[3] }]}>
          <View style={[styles.titles, { gap: theme.spacing[1] }]}>
            <View style={[styles.titleRow, { gap: theme.spacing[2] }]}>
              <AppText variant="subheading" numberOfLines={1} style={styles.shrink}>
                {campaign.category.name}
              </AppText>
              <AppBadge
                label={ended ? "Ended" : running ? "Running" : "Paused"}
                tone={running ? "success" : ended ? "neutral" : "warning"}
              />
            </View>
            <AppText variant="caption" tone="secondary">
              {formatDate(campaign.startDate)} to {formatDate(campaign.endDate)}
              {campaign.targetLocation ? ` · ${campaign.targetLocation}` : ""}
            </AppText>
          </View>
          {!ended ? (
            <AppButton
              size="sm"
              variant="secondary"
              disabled={busy}
              onPress={() => onToggle(campaign)}
              leadingIcon={
                campaign.status === "active" ? (
                  <Pause size={14} color={iconColor} />
                ) : (
                  <Play size={14} color={iconColor} />
                )
              }
            >
              {campaign.status === "active" ? "Pause" : "Resume"}
            </AppButton>
          ) : null}
        </View>

        <View style={[styles.stats, { gap: theme.spacing[2] }]}>
          <CampaignStat
            icon={Eye}
            label="Shown"
            value={campaign.impressions.toLocaleString("en-IN")}
            hint="in search"
          />
          <CampaignStat
            icon={MousePointerClick}
            label="Contacts"
            value={campaign.clicks.toLocaleString("en-IN")}
            hint={campaign.ctrPct !== null ? `${campaign.ctrPct}% of views` : undefined}
          />
          <CampaignStat
            icon={Wallet}
            label="Spent"
            value={formatPrice(campaign.amountSpent) ?? ""}
            hint={`of ${formatPrice(campaign.budget) ?? ""}`}
          />
        </View>
        <AppProgress value={spentPct} height={6} tone={running ? "success" : "brand"} />
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  top: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap" },
  titles: { flexBasis: 180, flexGrow: 1 },
  titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  shrink: { flexShrink: 1 },
  stats: { flexDirection: "row", flexWrap: "wrap" },
});
