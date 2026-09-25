import { StyleSheet, View } from "react-native";
import { ChevronRight, ShieldCheck } from "lucide-react-native";

import { AppAvatar, AppBadge, AppCard, AppText, type BadgeTone } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { ProviderStatus, VerificationStatus } from "@/types";

interface Props {
  name: string;
  logoUrl: string | null;
  status: ProviderStatus;
  verification: VerificationStatus;
  email?: string;
  onPress: () => void;
}

const STATUS: Record<ProviderStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Live", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Needs changes", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

const VERIFICATION: Record<VerificationStatus, { label: string; tone: BadgeTone }> = {
  verified: { label: "Verified", tone: "brand" },
  partial: { label: "Partly verified", tone: "neutral" },
  none: { label: "Not verified", tone: "neutral" },
};

/** Logo, business name and listing status at the top of the More tab. */
export function BusinessHeader({ name, logoUrl, status, verification, email, onPress }: Props) {
  const theme = useTheme();
  const s = STATUS[status] ?? STATUS.pending;
  const v = VERIFICATION[verification] ?? VERIFICATION.none;
  return (
    <AppCard onPress={onPress} accessibilityLabel={`${name}, edit business profile`}>
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <AppAvatar name={name} uri={logoUrl} size={56} shape="rounded" />
        <View style={[styles.body, { gap: theme.spacing[1] }]}>
          <AppText variant="heading" numberOfLines={2}>
            {name}
          </AppText>
          {email ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {email}
            </AppText>
          ) : null}
          <View style={[styles.badges, { gap: theme.spacing[1.5] }]}>
            <AppBadge label={s.label} tone={s.tone} />
            <AppBadge
              label={v.label}
              tone={v.tone}
              icon={
                verification === "verified" ? (
                  <ShieldCheck size={11} color={theme.colors.brand.softText} />
                ) : undefined
              }
            />
          </View>
        </View>
        <ChevronRight size={18} color={theme.colors.text.tertiary} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  body: { flex: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
});
