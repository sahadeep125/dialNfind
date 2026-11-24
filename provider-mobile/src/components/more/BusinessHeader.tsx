import { StyleSheet, View } from "react-native";
import { ChevronRight, ShieldCheck } from "lucide-react-native";

import { AppAvatar, AppBadge, AppCard, AppText, type BadgeTone } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { AccountTypeBadge } from "@/components/listing/AccountTypeBadge";
import type { ProviderStatus, VerificationStatus } from "@/types";
import type { BusinessType } from "@/types/onboarding";

interface Props {
  name: string;
  logoUrl: string | null;
  status: ProviderStatus;
  verification: VerificationStatus;
  email?: string;
  /** Individual professional or business; shown as a badge beside the status. */
  type?: BusinessType;
  /** "Plumber – Ghoraguli": what the listing is, under the name. */
  subtitle?: string | null;
  /** 0–100; shown as a thin bar when the profile is not complete. */
  completeness?: number;
  onPress: () => void;
}

const STATUS: Record<ProviderStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Live", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Needs changes", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

/** Logo, business name, listing status and profile completeness at the top of the More tab. Taps through to the profile. */
export function BusinessHeader({
  name,
  logoUrl,
  status,
  verification,
  email,
  type,
  subtitle,
  completeness,
  onPress,
}: Props) {
  const theme = useTheme();
  const s = STATUS[status] ?? STATUS.pending;
  const showBar = completeness !== undefined && completeness < 100;
  return (
    <AppCard onPress={onPress} accessibilityLabel={`${name}, edit ${type === "individual" ? "your" : "business"} profile`} padding={14}>
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <AppAvatar name={name} uri={logoUrl} size={48} shape="rounded" />
        <View style={[styles.body, { gap: 3 }]}>
          <View style={[styles.row, { gap: 4 }]}>
            <AppText variant="section" numberOfLines={1} style={styles.shrink}>
              {name}
            </AppText>
            {verification === "verified" ? (
              <ShieldCheck
                size={15}
                color={theme.colors.brand.primary}
                accessibilityLabel="Verified"
              />
            ) : null}
          </View>
          {subtitle ? (
            <AppText variant="meta" tone="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
          {email ? (
            <AppText variant="meta" numberOfLines={1}>
              {email}
            </AppText>
          ) : null}
          <View style={[styles.badges, { gap: theme.spacing[1.5] }]}>
            <AppBadge label={s.label} tone={s.tone} dot />
            {type ? <AccountTypeBadge type={type} /> : null}
          </View>
        </View>
        <ChevronRight size={16} color={theme.colors.text.tertiary} />
      </View>
      {showBar ? (
        <View style={[styles.row, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
          <View style={[styles.track, { backgroundColor: theme.colors.background.subtle }]}>
            <View
              style={[
                styles.fill,
                { width: `${completeness}%`, backgroundColor: theme.colors.brand.primary },
              ]}
            />
          </View>
          <AppText variant="meta" numeric>
            {completeness}% complete
          </AppText>
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap" },
  track: { borderRadius: 2, flex: 1, height: 4, overflow: "hidden" },
  fill: { borderRadius: 2, height: 4 },
});
