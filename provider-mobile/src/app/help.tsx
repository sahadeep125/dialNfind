import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LifeBuoy, Mail, Phone } from "lucide-react-native";

import { AppButton, AppCard, AppText } from "@/components/design-system";
import { Screen, ScreenHeader } from "@/components/layout";
import { FaqItem } from "@/components/more/FaqItem";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openEmail, openPhone } from "@/services/links";
import { formatPhone } from "@/utils/format";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do customers find my business?",
    a: "Customers search by service and area. Listings are ranked by how well they match, distance, ratings and reviews, and how complete and responsive your profile is. Adding services, hours, service areas and photos helps you show up more often.",
  },
  {
    q: "What is a lead?",
    a: "A lead is a customer who tapped Call or WhatsApp on your listing, or sent you an enquiry. The Leads tab lists them with the service they looked at and any details they shared, so you can follow up quickly.",
  },
  {
    q: "Is DialNFind taking a cut of my jobs?",
    a: "No. Customers contact you directly and pay you directly. DialNFind does not take bookings or commission on your work.",
  },
  {
    q: "How do reviews work?",
    a: "Customers who contacted you can leave a rating and review. You can reply publicly from the Reviews tab. A short, polite reply to every review, including the critical ones, builds trust with new customers.",
  },
  {
    q: "Can I remove a bad review?",
    a: "You cannot delete reviews yourself. If a review is fake, abusive or about a different business, open a support request with the topic Report a customer or review and our team will check it against the review guidelines.",
  },
  {
    q: "How do I get the Verified badge?",
    a: "Open Verification from the More tab and upload an identity document and, if you have one, a business document such as a GST certificate or shop licence. Our team checks them and updates your status. Documents are never shown to customers.",
  },
  {
    q: "How does promotion work?",
    a: "A sponsored campaign shows your listing with a Sponsored label when customers in your city search a category you offer. You set a budget and a duration of 7, 14 or 30 days, and you are charged only when a customer calls or messages you. You can pause and resume a campaign at any time.",
  },
  {
    q: "What do the paid plans add?",
    a: "Every plan keeps your listing free to find. Paid plans include more leads each month, profile analytics, a partner badge and a small ranking boost. You can change plan or turn off auto-renew under Plan and billing.",
  },
  {
    q: "My listing is in review. What now?",
    a: "New listings are checked by our team before they go live, usually within one working day. You can keep improving your profile in the meantime. If we need changes, we will let you know.",
  },
  {
    q: "How do I close my business account?",
    a: "Business accounts are closed by our support team so that your listing, reviews and any plan are handled properly. Go to More, then Close account, and send the request. We will confirm with you before anything is removed.",
  },
];

export default function HelpScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { data: config } = useAppConfig();
  const [open, setOpen] = useState<number | null>(0);
  const email = config?.support_email || SUPPORT_EMAIL;
  const phone = config?.support_phone || SUPPORT_PHONE;

  const onToggle = useCallback(
    (index: number): void => setOpen((current) => (current === index ? null : index)),
    [],
  );

  const run = async (action: () => Promise<void>, failure: string): Promise<void> => {
    try {
      await action();
    } catch (error: unknown) {
      toast(`${failure} ${errorMessage(error)}`, "error");
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Help and FAQ" />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[4],
          gap: theme.spacing[5],
          paddingBottom: theme.spacing[10],
        }}
      >
        <AppCard padding={0}>
          {FAQ.map((item, i) => (
            <FaqItem
              key={item.q}
              index={i}
              question={item.q}
              answer={item.a}
              expanded={open === i}
              onToggle={onToggle}
            />
          ))}
        </AppCard>

        <AppCard variant="tinted">
          <View style={{ gap: theme.spacing[3] }}>
            <AppText variant="subheading">Still need help?</AppText>
            <AppText tone="secondary">
              {config?.support_hours
                ? `Our team is available ${config.support_hours}. Requests you send from the app keep the whole conversation in one place.`
                : "Our team usually replies within one working day. Requests you send from the app keep the whole conversation in one place."}
            </AppText>
            <AppButton
              fullWidth
              leadingIcon={<LifeBuoy size={16} color={theme.components.button.primary.text} />}
              onPress={() => router.push({ pathname: "/support", params: { new: "1" } })}
            >
              Contact support
            </AppButton>
            <View style={[styles.row, { gap: theme.spacing[2] }]}>
              <AppButton
                variant="secondary"
                style={styles.button}
                leadingIcon={<Mail size={16} color={theme.colors.text.primary} />}
                onPress={() =>
                  void run(
                    () => openEmail(email, "Help with DialNFind Business"),
                    "Could not open email.",
                  )
                }
              >
                Email us
              </AppButton>
              <AppButton
                variant="secondary"
                style={styles.button}
                leadingIcon={<Phone size={16} color={theme.colors.text.primary} />}
                onPress={() => void run(() => openPhone(phone), "Calling is not available.")}
              >
                Call us
              </AppButton>
            </View>
            <AppText variant="caption" tone="secondary" align="center">
              {email} · {formatPhone(phone)}
            </AppText>
          </View>
        </AppCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
  button: { flexBasis: 130, flexGrow: 1 },
});
