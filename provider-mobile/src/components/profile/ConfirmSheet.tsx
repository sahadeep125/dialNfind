import { StyleSheet, View } from "react-native";

import { AppButton, AppSheet, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Bottom sheet that asks before a destructive action such as removing a service or a photo. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: Props) {
  const theme = useTheme();
  return (
    <AppSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
        <AppText tone="secondary">{message}</AppText>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <AppButton variant="secondary" onPress={onClose} disabled={loading} style={styles.flex}>
            Cancel
          </AppButton>
          <AppButton
            variant="destructive"
            onPress={onConfirm}
            loading={loading}
            style={styles.flex}
          >
            {confirmLabel}
          </AppButton>
        </View>
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  flex: { flex: 1 },
});
