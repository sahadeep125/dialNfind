import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppAvatar, AppPressable, AppText } from "@/components/design-system";
import { SectionHeader } from "@/components/layout";
import { useContacts } from "@/hooks/useContacts";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProviderCard } from "@/types";

const MAX = 8;
const TILE = 76;

interface Props {
  inset: number;
}

/** Providers the person reached out to lately, one tap from calling again. Signed-in only. */
export function RecentContacts({ inset }: Props) {
  const theme = useTheme();
  const signedIn = useAuthStore((s) => !!s.token);
  const contacts = useContacts();
  const providers = useMemo(() => {
    const seen = new Set<number>();
    const out: ProviderCard[] = [];
    for (const c of contacts.data?.pages[0]?.contacts ?? []) {
      if (seen.has(c.provider.id)) continue;
      seen.add(c.provider.id);
      out.push(c.provider);
      if (out.length === MAX) break;
    }
    return out;
  }, [contacts.data]);

  if (!signedIn || !providers.length) return null;

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <View style={{ paddingHorizontal: inset }}>
        <SectionHeader
          title="Recently contacted"
          actionLabel="See all"
          onAction={() => router.push("/contacts")}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: inset, gap: theme.spacing[3] }}
      >
        {providers.map((p) => (
          <AppPressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.businessName}, open profile`}
            onPress={() => router.push(`/provider/${p.slug}`)}
            style={styles.tile}
          >
            <AppAvatar name={p.businessName} uri={p.logoUrl} size={60} shape="rounded" />
            <AppText variant="micro" align="center" numberOfLines={2}>
              {p.businessName}
            </AppText>
          </AppPressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", gap: 6, width: TILE },
});
