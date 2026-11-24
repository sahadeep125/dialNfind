import { useCallback, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { LifeBuoy, Mail, MapPin, Phone } from "lucide-react-native";

import { AppListItem, AppSection, AppSkeleton } from "@/components/design-system";
import { Screen, ScreenHeader, ScreenScroll } from "@/components/layout";
import { FaqItem } from "@/components/more/FaqItem";
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
    a: "A lead is a customer who tapped Call or WhatsApp on your listing. The Leads tab lists them with the service they looked at and any details they shared. Tap a lead to mark it contacted, won or lost and add a private note.",
  },
  {
    q: "Is KaajVa taking a cut of my jobs?",
    a: "No. Customers contact you directly and pay you directly. KaajVa does not take bookings or commission on your work.",
  },
  {
    q: "How do reviews work?",
    a: "Customers who contacted you can leave a rating and review. You can reply publicly from the Reviews tab. A short, polite reply to every review, including the critical ones, builds trust with new customers.",
  },
  {
    q: "Can I remove a bad review?",
    a: "You cannot delete reviews yourself. If a review is fake, abusive or about a different business, tap Report on the review and our team will check it against the review guidelines.",
  },
  {
    q: "How do I get the Verified badge?",
    a: "Open Verification from the More tab and upload an identity document and, if you have one, a business document such as a GST certificate or shop licence. Our team checks them and updates your status. Documents are never shown to customers.",
  },
  {
    q: "Does KaajVa cost anything?",
    a: "No. KaajVa is free for businesses. Every listing gets all its leads with full contact details, profile analytics and ranking, the WhatsApp button and as many photos as you like. There are no plans, fees or paid promotions.",
  },
  {
    q: "My listing is in review. What now?",
    a: "New listings are checked by our team before they go live, usually within one working day. You can keep improving your profile in the meantime. If we need changes, we will let you know.",
  },
  {
    q: "How do I delete my business account?",
    a: "Go to More, then Delete account. Your listing is removed from search. This cannot be undone.",
  },
];

export default function HelpScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { data: config, isLoading: configLoading } = useAppConfig();
  const [open, setOpen] = useState<number | null>(null);
  // Contacts are set by the KaajVa team in the admin console; a channel without one is not offered.
  const email = config?.support_email || null;
  const phone = config?.support_phone || null;

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
      <ScreenScroll>
        <AppSection title="Common questions" dividerInset={0}>
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
        </AppSection>

        <AppSection
          title="Still need help?"
          subtitle={
            config?.support_hours
              ? `Available ${config.support_hours}`
              : "We usually reply within one working day"
          }
        >
          <AppListItem
            title="Send a support request"
            subtitle="Keeps the whole conversation in one place"
            accent
            leading={<LifeBuoy size={16} color={theme.colors.brand.primary} />}
            onPress={() => router.push({ pathname: "/support", params: { new: "1" } })}
          />
          {configLoading ? (
            <View style={{ padding: 14 }}>
              <AppSkeleton height={14} width="60%" />
            </View>
          ) : null}
          {email ? (
            <AppListItem
              title="Email us"
              subtitle={email}
              leading={<Mail size={16} color={theme.colors.text.secondary} />}
              onPress={() =>
                void run(
                  () => openEmail(email, "Help with KaajVa Business"),
                  "Could not open email.",
                )
              }
            />
          ) : null}
          {phone ? (
            <AppListItem
              title="Call us"
              subtitle={formatPhone(phone)}
              leading={<Phone size={16} color={theme.colors.text.secondary} />}
              onPress={() => void run(() => openPhone(phone), "Calling is not available.")}
            />
          ) : null}
          {config?.office_address ? (
            <AppListItem
              title="Office"
              subtitle={config.office_address.replace(/\s*\n\s*/g, ", ")}
              leading={<MapPin size={16} color={theme.colors.text.secondary} />}
            />
          ) : null}
        </AppSection>
      </ScreenScroll>
    </Screen>
  );
}
