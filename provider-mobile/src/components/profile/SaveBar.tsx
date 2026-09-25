import { StyleSheet, View } from "react-native";

import { AppButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  label?: string;
  /** Blocks saving while an image or document is still uploading. */
  busy?: boolean;
}

/** Sticky footer for editor screens. Sits under the scroll view so it never covers a field. */
export function SaveBar({ dirty, saving, onSave, onDiscard, label = "Save changes", busy }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          backgroundColor: theme.colors.background.elevated,
          borderTopColor: theme.colors.border.primary,
        },
      ]}
    >
      <AppText variant="caption" tone="secondary" style={styles.status} numberOfLines={2}>
        {busy ? "Waiting for upload" : dirty ? "You have unsaved changes" : "All changes saved"}
      </AppText>
      {dirty && onDiscard ? (
        <AppButton variant="ghost" onPress={onDiscard} disabled={saving}>
          Discard
        </AppButton>
      ) : null}
      <AppButton onPress={onSave} loading={saving} disabled={!dirty || busy}>
        {label}
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: "center", borderTopWidth: 1, flexDirection: "row" },
  status: { flex: 1 },
});
