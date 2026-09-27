import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppIconButton, AppText } from "@/components/design-system";
import { BrandMark, Screen } from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
  /** Show a back button instead of the brand mark row (for secondary auth screens). */
  back?: boolean;
  children: ReactNode;
  /** Pinned under the form, e.g. "New here? Create an account". */
  footer?: ReactNode;
}

/** Shared frame for sign-in screens: brand, one big title, one line of context, then the form. */
export function AuthLayout({ title, subtitle, back = false, children, footer }: Props) {
  const theme = useTheme();
  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: theme.spacing[6],
              paddingTop: theme.spacing[back ? 2 : 10],
              paddingBottom: theme.spacing[6],
            },
          ]}
        >
          {back ? (
            <View style={{ marginLeft: -theme.spacing[3], marginBottom: theme.spacing[4] }}>
              <AppIconButton
                accessibilityLabel="Go back"
                icon={<ChevronLeft size={24} color={theme.colors.text.primary} />}
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
              />
            </View>
          ) : (
            <View style={[styles.brand, { gap: theme.spacing[2], marginBottom: theme.spacing[8] }]}>
              <BrandMark size={32} />
              <AppText variant="section">DialNFind</AppText>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.full },
                ]}
              >
                <AppText variant="overline" style={{ color: theme.colors.brand.softText }}>
                  BUSINESS
                </AppText>
              </View>
            </View>
          )}
          <View style={{ gap: theme.spacing[1.5], marginBottom: theme.spacing[6] }}>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
          </View>
          <View style={{ gap: 14 }}>{children}</View>
          {footer ? (
            <View style={[styles.footer, { paddingTop: theme.spacing[6] }]}>{footer}</View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignSelf: "center", flexGrow: 1, maxWidth: 440, width: "100%" },
  brand: { alignItems: "center", flexDirection: "row" },
  tag: { paddingHorizontal: 7, paddingVertical: 2 },
  footer: { flexGrow: 1, justifyContent: "flex-end" },
});
