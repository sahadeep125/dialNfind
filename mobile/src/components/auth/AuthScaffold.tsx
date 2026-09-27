import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { AppCard, AppIconTile, AppText, type IconTileTone } from "@/components/design-system";
import { BrandMark, Screen, ScreenHeader } from "@/components/layout";
import { MAX_FORM_WIDTH } from "@/constants/spacing";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  title: string;
  subtitle?: string;
  /** Glyph above the title. Without one, the DialNFind mark is shown. */
  icon?: LucideIcon;
  iconTone?: IconTileTone;
  headerTitle?: string;
  showBack?: boolean;
  children: ReactNode;
  /** Under the form: the switch between sign in and sign up, then small print. */
  footer?: ReactNode;
}

/**
 * Shared frame for sign in, sign up, password reset and email confirmation: a compact left-aligned
 * column starting at the top on phones, the same column on a centered card on tablets, with
 * keyboard avoidance.
 */
export function AuthScaffold({
  title,
  subtitle,
  icon,
  iconTone = "brand",
  headerTitle = "",
  showBack = true,
  children,
  footer,
}: Props) {
  const theme = useTheme();
  const { gutter, isTablet } = useLayout();

  const body = (
    <View style={{ gap: theme.spacing[6] }}>
      <View style={{ gap: theme.spacing[4] }}>
        {icon ? <AppIconTile icon={icon} tone={iconTone} size={44} /> : <BrandMark size={40} />}
        <View style={{ gap: theme.spacing[1] }}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
        </View>
      </View>
      <View style={{ gap: theme.spacing[3] }}>{children}</View>
    </View>
  );

  return (
    <Screen edges={["top", "bottom"]} width="full">
      <ScreenHeader title={headerTitle} showBack={showBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              justifyContent: isTablet ? "center" : "flex-start",
              paddingHorizontal: gutter + (isTablet ? 0 : theme.spacing[1]),
              paddingTop: isTablet ? theme.spacing[6] : theme.spacing[2],
              paddingBottom: theme.spacing[6],
            },
          ]}
        >
          <View style={[styles.column, { gap: theme.spacing[6] }]}>
            {isTablet ? <AppCard padding={theme.spacing[8]}>{body}</AppCard> : body}
            {footer ? <View style={{ gap: theme.spacing[4] }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  column: { alignSelf: "center", maxWidth: MAX_FORM_WIDTH, width: "100%" },
});
