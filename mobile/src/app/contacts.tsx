import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { Redirect, router } from "expo-router";
import { PhoneCall } from "lucide-react-native";

import { AppButton, AppSkeleton, AppText } from "@/components/design-system";
import { ContactRow } from "@/components/contacts/ContactRow";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { useAnswerContact, useContacts } from "@/hooks/useContacts";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ContactHistoryItem } from "@/types";

/** Providers the person called or messaged, so they can find them again and say whether they responded. */
export default function ContactsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const signedIn = useAuthStore((s) => !!s.token);
  const { data, error, isLoading, isError, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useContacts();
  const answer = useAnswerContact();
  const { mutate } = answer;
  const items = data?.pages.flatMap((page) => page.contacts) ?? [];

  const onAnswer = useCallback(
    (item: ContactHistoryItem, responded: boolean) =>
      mutate(
        { id: item.id, responded },
        {
          onSuccess: () => toast("Thanks, this helps rank providers fairly", "success"),
          onError: (e: Error) => toast(errorMessage(e), "error"),
        },
      ),
    [mutate, toast],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ContactHistoryItem>) => <ContactRow item={item} onAnswer={onAnswer} />,
    [onAnswer],
  );

  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Recent contacts" />
      <FlatList
        data={isLoading || isError ? [] : items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { padding: theme.spacing[4], gap: theme.spacing[3] }]}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListHeaderComponent={
          items.length > 0 ? (
            <AppText tone="secondary">
              Tell us whether each provider got back to you. It helps rank providers fairly.
            </AppText>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={theme.colors.brand.primary} /> : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[3] }}>
              <AppSkeleton shape="block" height={120} />
              <AppSkeleton shape="block" height={120} />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={PhoneCall}
              title="No contacts yet"
              text="Providers you call or message from DialNFind show up here."
              action={<AppButton onPress={() => router.push("/search")}>Find a provider</AppButton>}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
});
