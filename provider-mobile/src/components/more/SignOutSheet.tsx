import { StyleSheet, View } from "react-native";

import { AppButton, AppSheet, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutSheet({ visible, onClose, onConfirm }: Props) {
  const theme = useTheme();
  return (
    <AppSheet visible={visible} onClose={onClose} title="Sign out?">
      <View style={{ gap: theme.spacing[4], paddingHorizontal: theme.spacing[4] }}>
        <AppText tone="secondary">
          Your listing stays live and customers can still find and call you. Sign in again to see
          new leads and reviews.
        </AppText>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <AppButton variant="secondary" style={styles.flex} onPress={onClose}>
            Cancel
          </AppButton>
          <AppButton style={styles.flex} onPress={onConfirm}>
            Sign out
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
