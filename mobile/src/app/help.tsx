import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronDown, LifeBuoy, Mail, Phone } from "lucide-react-native";

import { AppButton, AppCard, AppDivider, AppPressable, AppText } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { openEmail, openPhone } from "@/services/links";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is DialNFind free to use?",
    a: "Yes. Searching, calling and messaging providers is free. You pay the provider directly for their work.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can search and contact providers as a guest. An account lets you save favorites and write reviews.",
  },
  {
    q: "How do I contact a provider?",
    a: "Tap Call or WhatsApp on any listing. You talk to the provider directly; DialNFind does not take bookings or payments.",
  },
  {
    q: "What does Verified mean?",
    a: "Our team has checked the provider's identity or business documents. Always agree on price and scope before work starts.",
  },
  {
    q: "How are providers ranked?",
    a: "By how well they match your search, distance, ratings, reviews and how complete and responsive their profile is. Sponsored listings are labelled.",
  },
  {
    q: "How do I change my area?",
    a: "Tap the location at the top of the Home screen and pick a city or locality, or use your current location.",
  },
  {
    q: "Can I edit or delete my review?",
    a: "Yes. Open My reviews, then tap Edit or Delete on the review.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings and tap Delete account. If you sign in with a password, you will be asked for it to confirm.",
  },
];

export default function HelpScreen() {
  const signedIn = useAuthStore((s) => !!s.token);
  const theme = useTheme();
  const toast = useToast();
  const { data: config } = useAppConfig();
  const [open, setOpen] = useState<number | null>(0);
  const email = config?.support_email || SUPPORT_EMAIL;
  const phone = config?.support_phone || SUPPORT_PHONE;

  const run = async (action: () => Promise<void>): Promise<void> => {
    try {
      await action();
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Help centre" />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[4],
          gap: theme.spacing[5],
          paddingBottom: theme.spacing[10],
        }}
      >
        <AppCard padding={0}>
          {FAQ.map((item, i) => {
            const expanded = open === i;
            return (
              <View key={item.q}>
                {i > 0 ? <AppDivider /> : null}
                <AppPressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  scale={false}
                  onPress={() => setOpen(expanded ? null : i)}
                  style={[styles.question, { padding: theme.spacing[4] }]}
                >
                  <AppText variant="label" style={styles.flex}>
                    {item.q}
                  </AppText>
                  <ChevronDown
                    size={18}
                    color={theme.colors.text.tertiary}
                    style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                  />
                </AppPressable>
                {expanded ? (
                  <AppText
                    tone="secondary"
                    style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[4] }}
                  >
                    {item.a}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </AppCard>

        <AppCard variant="tinted">
          <View style={{ gap: theme.spacing[3] }}>
            <AppText variant="subheading">Still need help?</AppText>
            <AppText tone="secondary">
              {config?.support_hours
                ? `Our team is available ${config.support_hours}.`
                : "Our team usually replies within one working day."}
            </AppText>
            {signedIn ? (
              <AppButton
                leadingIcon={<LifeBuoy size={16} color="#FFFFFF" />}
                onPress={() => router.push("/support")}
              >
                Open a support request
              </AppButton>
            ) : null}
            <View style={styles.row}>
              <AppButton
                variant={signedIn ? "secondary" : "primary"}
                style={styles.flex}
                leadingIcon={<Mail size={16} color={signedIn ? theme.colors.text.primary : "#FFFFFF"} />}
                onPress={() => void run(() => openEmail(email, "Help with DialNFind"))}
              >
                Email us
              </AppButton>
              <AppButton
                variant="secondary"
                style={styles.flex}
                leadingIcon={<Phone size={16} color={theme.colors.text.primary} />}
                onPress={() => void run(() => openPhone(phone))}
              >
                Call us
              </AppButton>
            </View>
          </View>
        </AppCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: { alignItems: "center", flexDirection: "row", gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
