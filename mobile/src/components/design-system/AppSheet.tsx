import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";
import { AppIconButton } from "./AppIconButton";
import { AppText } from "./AppText";

/** Horizontal padding inside sheets. Rows in inset={false} sheets should line up with it. */
export const SHEET_INSET = 20;

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Short line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Pad the content to the sheet's edges. Turn off for edge-to-edge lists that pad their own rows. */
  inset?: boolean;
}

/** Bottom sheet: slides up from the bottom, closes on backdrop tap, the close button or the back gesture. */
export function AppSheet({ visible, onClose, title, subtitle, children, inset = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable
          accessibilityLabel="Close"
          style={[styles.fill, { backgroundColor: theme.colors.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background.secondary,
              paddingBottom: Math.max(insets.bottom, theme.spacing[4]),
              borderTopLeftRadius: theme.components.sheet.radius,
              borderTopRightRadius: theme.components.sheet.radius,
            },
            theme.shadow.lg,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border.secondary }]} />
          <View style={styles.header}>
            <View style={styles.title}>
              <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
                {title ?? ""}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <AppIconButton
              accessibilityLabel="Close"
              size="sm"
              variant="ghost"
              style={{ backgroundColor: theme.colors.background.tertiary }}
              icon={<X size={18} color={theme.colors.text.secondary} strokeWidth={2.4} />}
              onPress={onClose}
            />
          </View>
          <View style={[styles.body, inset ? styles.inset : null]}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    alignSelf: "center",
    maxHeight: "88%",
    borderCurve: "continuous",
    maxWidth: MAX_CONTENT_WIDTH,
    paddingTop: 10,
    width: "100%",
  },
  handle: { alignSelf: "center", borderRadius: 3, height: 5, marginBottom: 10, width: 44 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: SHEET_INSET,
  },
  title: { flex: 1, gap: 2 },
  body: { flexShrink: 1 },
  inset: { paddingHorizontal: SHEET_INSET },
});
