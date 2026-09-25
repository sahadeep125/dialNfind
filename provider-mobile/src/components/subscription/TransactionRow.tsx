import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { Transaction } from "@/types/billing";
import { formatDate, formatPrice } from "@/utils/format";

interface Props {
  transaction: Transaction;
}

const GATEWAY_LABEL = { manual: "Paid to our team", razorpay: "Paid online", app_store: "App Store", play_store: "Google Play" } as const;

const TYPE_LABEL: Record<string, string> = {
  subscription: "Plan payment",
  sponsored_ad: "Sponsored campaign",
};

export const TransactionRow = memo(function TransactionRow({ transaction: t }: Props) {
  const theme = useTheme();
  const label = TYPE_LABEL[t.type] ?? t.type.replace(/_/g, " ");
  return (
    <View style={[styles.row, { gap: theme.spacing[3], padding: theme.spacing[4] }]}>
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={1}>
          {label}
          {t.status !== "success" ? (
            <AppText variant="caption" tone="danger">
              {`  ${t.status}`}
            </AppText>
          ) : null}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {[formatDate(t.createdAt), GATEWAY_LABEL[t.gateway], t.invoiceNumber].filter(Boolean).join(" · ")}
        </AppText>
      </View>
      <AppText variant="label">{t.currency === "INR" ? formatPrice(t.amount) : `${t.currency} ${t.amount.toFixed(2)}`}</AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1, gap: 2 },
});
