import type { ReactNode } from "react";
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom space, e.g. for a floating save bar. */
  bottomInset?: number;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** The scrolling body of a screen with the shared padding and section rhythm. */
export function ScreenScroll({
  children,
  refreshing,
  onRefresh,
  bottomInset = 0,
  keyboard = false,
  contentStyle,
}: Props) {
  const theme = useTheme();
  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboard ? "handled" : undefined}
      keyboardDismissMode={keyboard ? "on-drag" : undefined}
      contentContainerStyle={[
        {
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing[1],
          paddingBottom: theme.spacing[10] + bottomInset,
          gap: theme.layout.sectionGap,
        },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
