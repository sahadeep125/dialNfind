import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useTheme } from "@/hooks/useTheme";
import { AppIconButton } from "./AppIconButton";
import { AppText } from "./AppText";

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** One line under the title. */
  subtitle?: string;
  children: ReactNode;
}

/** Bottom sheet: slides up from the bottom, closes on backdrop tap, the close button or the back gesture. */
export function AppSheet({ visible, onClose, title, subtitle, children }: Props) {
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
              borderTopLeftRadius: theme.radius["2xl"],
              borderTopRightRadius: theme.radius["2xl"],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border.secondary }]} />
          <View style={[styles.header, { gap: theme.spacing[3] }]}>
            <View style={styles.title}>
              <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
                {title ?? ""}
              </AppText>
              {subtitle ? (
                <AppText variant="meta" numberOfLines={2}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <AppIconButton
              accessibilityLabel="Close"
              size="sm"
              variant="neutral"
              icon={<X size={16} color={theme.colors.text.secondary} />}
              onPress={onClose}
            />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    alignSelf: "center",
    maxHeight: "90%",
    maxWidth: MAX_CONTENT_WIDTH,
    paddingTop: 6,
    width: "100%",
  },
  handle: { alignSelf: "center", borderRadius: 3, height: 4, marginBottom: 6, width: 36 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  title: { flex: 1, gap: 2 },
});
