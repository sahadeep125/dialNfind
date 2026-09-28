import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import {
  ChevronDown,
  LifeBuoy,
  Mail,
  Phone,
  Search,
  SearchX,
  type LucideIcon,
} from "lucide-react-native";

import {
  AppCard,
  AppDivider,
  AppIconTile,
  AppInput,
  AppPressable,
  AppText,
  type IconTileTone,
} from "@/components/design-system";
import { EmptyState, Screen, ScreenHeader, SectionHeader } from "@/components/layout";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openEmail, openPhone } from "@/services/links";
import { useAuthStore } from "@/stores/useAuthStore";

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
    q: "How do I choose a good provider?",
    a: "Compare ratings and recent reviews, prefer verified listings, ask for a quote before work starts, and call two or three providers for bigger jobs.",
  },
  {
    q: "How much will the service cost?",
    a: "Each provider sets their own prices. Describe the job on the call and ask for a quote before work starts.",
  },
  {
    q: "Do I pay through DialNFind?",
    a: "No. You pay the provider directly by cash, UPI or any method you agree on. DialNFind takes no commission and adds no booking fees.",
  },
  {
    q: "A listing has a wrong number or the business has closed. What can I do?",
    a: "Open the listing and tap Report this listing. Our team checks every report.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings and tap Delete account. If you sign in with a password, you will be asked for it to confirm.",
  },
];

function ContactTile({
  icon,
  tone,
  title,
  text,
  onPress,
}: {
  icon: LucideIcon;
  tone: IconTileTone;
  title: string;
  text: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <AppCard
      onPress={onPress}
      accessibilityLabel={`${title}. ${text}`}
      padding={theme.spacing[4]}
      style={styles.tile}
    >
      <AppIconTile icon={icon} tone={tone} size={40} />
      <View style={{ gap: 2, marginTop: theme.spacing[3] }}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="micro" tone="secondary" numberOfLines={2}>
          {text}
        </AppText>
      </View>
    </AppCard>
  );
}

export default function HelpScreen() {
  const signedIn = useAuthStore((s) => !!s.token);
  const theme = useTheme();
  const { gutter } = useLayout();
  const toast = useToast();
  const { data: config } = useAppConfig();
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  // Set by the team under Settings in the admin console; a contact that is not set is not shown.
  const email = config?.support_email || null;
  const phone = config?.support_phone || null;

  const faq = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? FAQ.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
      : FAQ;
  }, [query]);

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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: theme.spacing[2],
          gap: theme.spacing[6],
          paddingBottom: theme.spacing[10],
        }}
      >
        <View style={{ gap: theme.spacing[4] }}>
          <AppText variant="title" accessibilityRole="header">
            How can we help?
          </AppText>
          <AppInput
            appearance="outlined"
            value={query}
            onChangeText={(v) => (setQuery(v), setOpen(null))}
            placeholder="Search questions"
            accessibilityLabel="Search questions"
            autoCorrect={false}
            returnKeyType="search"
            leadingIcon={<Search size={18} color={theme.colors.brand.primary} strokeWidth={2.4} />}
          />
        </View>

        <View style={{ gap: theme.spacing[3] }}>
          <SectionHeader title="Common questions" />
          {faq.length ? (
            <AppCard padding={0}>
              {faq.map((item, i) => {
                const expanded = open === i;
                return (
                  <View key={item.q}>
                    {i > 0 ? <AppDivider inset={theme.spacing[4]} /> : null}
                    <AppPressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      scale={false}
                      onPress={() => setOpen(expanded ? null : i)}
                      style={[styles.question, { padding: theme.spacing[4] }]}
                    >
                      <AppText
                        variant="label"
                        tone={expanded ? "brand" : "primary"}
                        style={styles.flex}
                      >
                        {item.q}
                      </AppText>
                      <ChevronDown
                        size={18}
                        color={expanded ? theme.colors.brand.primary : theme.colors.text.tertiary}
                        style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                      />
                    </AppPressable>
                    {expanded ? (
                      <AppText
                        tone="secondary"
                        style={[
                          styles.answer,
                          { paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[4] },
                        ]}
                      >
                        {item.a}
                      </AppText>
                    ) : null}
                  </View>
                );
              })}
            </AppCard>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No matching questions"
              text="Try another word, or contact us below."
            />
          )}
        </View>

        <View style={{ gap: theme.spacing[3] }}>
          <SectionHeader
            title="Still need help?"
            subtitle={
              config?.support_hours
                ? `Our team is available ${config.support_hours}.`
                : "Our team usually replies within one working day."
            }
          />
          <View style={[styles.tiles, { gap: theme.spacing[3] }]}>
            {signedIn ? (
              <ContactTile
                icon={LifeBuoy}
                tone="brand"
                title="Support request"
                text="Write to us and follow the replies"
                onPress={() => router.push("/support")}
              />
            ) : null}
            {email ? (
              <ContactTile
                icon={Mail}
                tone="accent"
                title="Email us"
                text={email}
                onPress={() => void run(() => openEmail(email, "Help with DialNFind"))}
              />
            ) : null}
            {phone ? (
              <ContactTile
                icon={Phone}
                tone="success"
                title="Call us"
                text="Talk to the team"
                onPress={() => void run(() => openPhone(phone))}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: { alignItems: "center", flexDirection: "row", gap: 12 },
  answer: { lineHeight: 23 },
  tiles: { flexDirection: "row", flexWrap: "wrap" },
  tile: { flexBasis: 140, flexGrow: 1 },
  flex: { flex: 1 },
});
