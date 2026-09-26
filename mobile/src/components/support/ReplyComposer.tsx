import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Send } from "lucide-react-native";

import { AppButton, AppInput } from "@/components/design-system";
import { useReplyTicket } from "@/hooks/useSupport";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";

import { AttachmentPicker } from "./AttachmentPicker";

interface Props {
  ticketId: number;
  onSent?: () => void;
}

/** Reply box under an open support conversation, with optional attachments. */
export function ReplyComposer({ ticketId, onSent }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const reply = useReplyTicket(ticketId);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = (): void => {
    if (!body.trim()) {
      setError("Write a message first");
      return;
    }
    setError(null);
    reply.mutate(
      { body, attachments: files },
      {
        onSuccess: () => {
          setBody("");
          setFiles([]);
          toast("Message sent", "success");
          onSent?.();
        },
        onError: (e: Error) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <View
      style={[
        styles.box,
        {
          gap: theme.spacing[3],
          padding: theme.spacing[4],
          backgroundColor: theme.components.card.background,
          borderColor: theme.components.card.border,
          borderRadius: theme.components.card.radius,
        },
      ]}
    >
      <AppInput
        label="Reply"
        multiline
        maxLength={5000}
        value={body}
        error={error}
        placeholder="Write your message"
        onChangeText={(v) => {
          setBody(v);
          setError(null);
        }}
      />
      <AttachmentPicker files={files} onChange={setFiles} onBusyChange={setUploading} />
      <AppButton
        style={styles.send}
        loading={reply.isPending}
        disabled={uploading}
        onPress={send}
        leadingIcon={<Send size={16} color={theme.components.button.primary.text} />}
      >
        Send
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
  send: { alignSelf: "flex-end" },
});
