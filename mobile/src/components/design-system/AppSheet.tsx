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
  children: ReactNode;
}

/** Bottom sheet: slides up from the bottom, closes on backdrop tap, the close button or the back gesture. */
export function AppSheet({ visible, onClose, title, children }: Props) {
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
          <View style={styles.header}>
            <AppText variant="heading" style={styles.title} numberOfLines={1}>
              {title ?? ""}
            </AppText>
            <AppIconButton
              accessibilityLabel="Close"
              size="sm"
              variant="soft"
              icon={<X size={18} color={theme.colors.brand.softText} />}
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
    maxHeight: "88%",
    maxWidth: MAX_CONTENT_WIDTH,
    paddingTop: 8,
    width: "100%",
  },
  handle: { alignSelf: "center", borderRadius: 3, height: 5, marginBottom: 8, width: 40 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { flex: 1 },
});
