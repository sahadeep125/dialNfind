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
  const state = busy ? "Waiting for upload" : dirty ? "Unsaved changes" : "All changes saved";
  const dot = busy
    ? theme.colors.semantic.warning
    : dirty
      ? theme.colors.brand.primary
      : theme.colors.semantic.success;
  return (
    <View
      style={[
        styles.bar,
        {
          gap: theme.spacing[2],
          paddingHorizontal: theme.layout.screenPadding,
          paddingVertical: theme.spacing[2.5],
          backgroundColor: theme.colors.background.elevated,
          borderTopColor: theme.colors.border.primary,
        },
      ]}
    >
      <View style={[styles.status, { gap: theme.spacing[1.5] }]} accessibilityLiveRegion="polite">
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <AppText variant="meta" tone="secondary" numberOfLines={1} style={styles.shrink}>
          {state}
        </AppText>
      </View>
      {dirty && onDiscard ? (
        <AppButton variant="ghost" size="sm" onPress={onDiscard} disabled={saving}>
          Discard
        </AppButton>
      ) : null}
      <AppButton
        size="sm"
        onPress={onSave}
        loading={saving}
        disabled={!dirty || busy}
        style={styles.save}
      >
        {label}
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row" },
  status: { alignItems: "center", flex: 1, flexDirection: "row" },
  dot: { borderRadius: 3, height: 6, width: 6 },
  shrink: { flexShrink: 1 },
  save: { minWidth: 96 },
});
