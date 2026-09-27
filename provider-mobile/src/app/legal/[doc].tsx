import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ExternalLink, FileQuestion } from "lucide-react-native";

import { AppButton, AppCallout, AppText } from "@/components/design-system";
import { EmptyState, Screen, ScreenHeader } from "@/components/layout";
import { LEGAL_DOCS, type LegalDocKey } from "@/components/more/legalDocs";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";

function isDocKey(value: string | undefined): value is LegalDocKey {
  return value === "terms" || value === "privacy";
}

export default function LegalScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { data: config } = useAppConfig();

  if (!isDocKey(doc)) {
    return (
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Legal" />
        <EmptyState
          icon={FileQuestion}
          title="Page not found"
          text="This document does not exist. Go back and choose Terms or Privacy."
        />
      </Screen>
    );
  }

  const content = LEGAL_DOCS[doc];
  const onlineUrl = doc === "terms" ? config?.terms_url : config?.privacy_url;

  const openOnline = async (): Promise<void> => {
    if (!onlineUrl) return;
    try {
      await openUrl(onlineUrl);
    } catch (error: unknown) {
      toast(`Could not open the page. ${errorMessage(error)}`, "error");
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title={doc === "terms" ? "Terms" : "Privacy"} />
      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingTop: theme.spacing[1],
          gap: theme.layout.sectionGap,
          paddingBottom: theme.spacing[10],
        }}
      >
        <View style={{ gap: theme.spacing[1] }}>
          <AppText variant="title" accessibilityRole="header">
            {content.title}
          </AppText>
          <AppText variant="meta">Last updated {content.updated}</AppText>
        </View>
        {onlineUrl ? (
          <AppCallout
            title="Official version"
            action={
              <AppButton
                size="sm"
                variant="soft"
                style={styles.start}
                leadingIcon={<ExternalLink size={14} color={theme.colors.brand.softText} />}
                onPress={() => void openOnline()}
              >
                Read it online
              </AppButton>
            }
          >
            This is a summary. The latest published version is the one that applies.
          </AppCallout>
        ) : null}
        <AppText tone="secondary">{content.intro}</AppText>
        {content.sections.map((section) => (
          <View key={section.heading} style={{ gap: theme.spacing[1.5] }}>
            <AppText variant="section" accessibilityRole="header">
              {section.heading}
            </AppText>
            <AppText tone="secondary" style={{ lineHeight: 21 }}>
              {section.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: { alignSelf: "flex-start" },
});
