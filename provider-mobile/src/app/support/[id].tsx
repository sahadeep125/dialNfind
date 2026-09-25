import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";

import { AppButton, AppCard, AppSheet, AppSkeleton, AppText } from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { MessageBubble } from "@/components/support/MessageBubble";
import { ReplyComposer } from "@/components/support/ReplyComposer";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { useCloseTicket, useTicket } from "@/hooks/useSupport";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { TicketMessage } from "@/types/support";
import { formatDate } from "@/utils/format";

export default function SupportTicketScreen() {
  const theme = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const detail = useTicket(id);
  const close = useCloseTicket(id);
  const [confirmClose, setConfirmClose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ticket = detail.data?.ticket;

  const renderItem = useCallback(
    ({ item }: { item: TicketMessage }) => <MessageBubble message={item} />,
    [],
  );

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await detail.refetch();
    setRefreshing(false);
  };

  const closeTicket = (): void => {
    close.mutate(undefined, {
      onSuccess: () => {
        setConfirmClose(false);
        toast("Request closed", "success");
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title={ticket?.reference ?? "Support request"} />
      {detail.isError && !detail.data ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : !detail.data || !ticket ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          <AppSkeleton height={24} width="80%" />
          <AppSkeleton height={14} width="50%" />
          <AppSkeleton shape="block" height={100} />
          <AppSkeleton shape="block" height={100} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.fill}
        >
          <FlatList
            data={detail.data.messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            contentContainerStyle={{
              padding: theme.spacing[4],
              gap: theme.spacing[3],
              paddingBottom: theme.spacing[10],
            }}
            ListHeaderComponent={
              <View style={[styles.header, { gap: theme.spacing[2] }]}>
                <AppText variant="title" accessibilityRole="header">
                  {ticket.subject}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {ticket.reference} · opened {formatDate(ticket.createdAt)}
                </AppText>
                <View style={[styles.actions, { gap: theme.spacing[3] }]}>
                  <TicketStatusBadge status={ticket.status} />
                  {ticket.status !== "closed" ? (
                    <AppButton
                      size="sm"
                      variant="secondary"
                      leadingIcon={<CheckCircle2 size={14} color={theme.colors.semantic.success} />}
                      onPress={() => setConfirmClose(true)}
                    >
                      Mark as solved
                    </AppButton>
                  ) : null}
                </View>
              </View>
            }
            ListFooterComponent={
              ticket.status === "closed" ? (
                <AppCard variant="flat">
                  <View style={{ gap: theme.spacing[3] }}>
                    <AppText tone="secondary">
                      This request is closed. Start a new one if you still need help.
                    </AppText>
                    <AppButton
                      variant="soft"
                      onPress={() => router.replace({ pathname: "/support", params: { new: "1" } })}
                    >
                      New request
                    </AppButton>
                  </View>
                </AppCard>
              ) : (
                <ReplyComposer ticketId={id} />
              )
            }
          />
        </KeyboardAvoidingView>
      )}

      <AppSheet
        visible={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Mark as solved?"
      >
        <View style={{ gap: theme.spacing[4], padding: theme.spacing[4], paddingTop: 0 }}>
          <AppText tone="secondary">
            This closes the request. You will not be able to reply to it, but you can always open a
            new one.
          </AppText>
          <View style={[styles.row, { gap: theme.spacing[3] }]}>
            <AppButton
              variant="secondary"
              style={styles.fill}
              onPress={() => setConfirmClose(false)}
            >
              Keep open
            </AppButton>
            <AppButton style={styles.fill} loading={close.isPending} onPress={closeTicket}>
              Close request
            </AppButton>
          </View>
        </View>
      </AppSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { marginBottom: 8 },
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
  row: { flexDirection: "row" },
});
