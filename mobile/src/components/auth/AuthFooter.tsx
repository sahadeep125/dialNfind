import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { legalUrl, openUrl } from "@/services/links";

interface SwitchProps {
  prompt: string;
  action: string;
  onPress: () => void;
}

/** "New to DialNFind? Create an account": the one-line hop between sign in and sign up. */
export function AuthSwitch({ prompt, action, onPress }: SwitchProps) {
  return (
    <View style={styles.row}>
      <AppText tone="secondary">{prompt}</AppText>
      <AppPressable accessibilityRole="link" hitSlop={10} onPress={onPress}>
        <AppText variant="label" tone="brand">
          {action}
        </AppText>
      </AppPressable>
    </View>
  );
}

/** Terms and privacy small print with working links. Shown once per auth screen. */
export function LegalNote({ lead }: { lead: string }) {
  const toast = useToast();
  const { data: config } = useAppConfig();

  const open = async (url: string | null | undefined): Promise<void> => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (error: unknown) {
      toast(`Could not open the page. ${errorMessage(error)}`, "error");
    }
  };

  return (
    <AppText variant="caption" tone="tertiary" align="center">
      {lead} you agree to the{" "}
      <AppText
        variant="caption"
        tone="brand"
        onPress={() => void open(legalUrl("terms", config?.terms_url))}
      >
        Terms
      </AppText>{" "}
      and{" "}
      <AppText
        variant="caption"
        tone="brand"
        onPress={() => void open(legalUrl("privacy", config?.privacy_url))}
      >
        Privacy policy
      </AppText>
      .
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
});
