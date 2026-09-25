import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LifeBuoy, Mail } from "lucide-react-native";

import { AppButton, AppSheet, AppText } from "@/components/design-system";
import { SUPPORT_EMAIL } from "@/constants/config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useCreateTicket } from "@/hooks/useSupport";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openEmail } from "@/services/links";

interface Props {
  visible: boolean;
  onClose: () => void;
  businessName: string;
}

const SUBJECT = "Close my business account";

/**
 * Business accounts cannot be deleted from the app (the API only lets customers delete
 * themselves), so this explains the process and opens a support request for it.
 */
export function CloseAccountSheet({ visible, onClose, businessName }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const create = useCreateTicket();
  const { data: config } = useAppConfig();
  const email = config?.support_email || SUPPORT_EMAIL;

  const request = (): void => {
    create.mutate(
      {
        category: "account",
        subject: SUBJECT,
        message: `Please close the DialNFind business account for ${businessName} and remove the listing. I understand this cannot be undone.`,
        attachments: [],
      },
      {
        onSuccess: ({ ticket }) => {
          onClose();
          toast(`Request ${ticket.reference} sent`, "success");
          router.push(`/support/${ticket.id}`);
        },
        onError: (error: Error) => toast(errorMessage(error), "error"),
      },
    );
  };

  const mail = async (): Promise<void> => {
    try {
      await openEmail(email, `${SUBJECT}: ${businessName}`);
    } catch (error: unknown) {
      toast(`Could not open email. ${errorMessage(error)}`, "error");
    }
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title="Close your account?">
      <View style={{ gap: theme.spacing[4], paddingHorizontal: theme.spacing[4] }}>
        <AppText tone="secondary">
          Business accounts are closed by the DialNFind support team, so your listing, reviews and
          any running plan or campaign are handled properly. Send us a request and we will confirm
          with you before anything is removed.
        </AppText>
        <AppButton
          variant="destructive"
          fullWidth
          loading={create.isPending}
          leadingIcon={<LifeBuoy size={16} color={theme.colors.semantic.danger} />}
          onPress={request}
        >
          Ask support to close it
        </AppButton>
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <AppButton variant="secondary" style={styles.flex} onPress={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="ghost"
            style={styles.flex}
            leadingIcon={<Mail size={16} color={theme.colors.text.primary} />}
            onPress={() => void mail()}
          >
            Email instead
          </AppButton>
        </View>
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  flex: { flex: 1 },
});
