import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppButton, AppCallout, AppInput, AppSheet, AppText } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { useCreateTicket } from "@/hooks/useSupport";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage } from "@/services/api";
import type { Ticket, TicketCategory } from "@/types/support";

import { AttachmentPicker } from "./AttachmentPicker";
import { TICKET_CATEGORIES } from "./ticketMeta";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

interface Errors {
  category?: string;
  subject?: string;
  message?: string;
}

function validate(category: TicketCategory | null, subject: string, message: string): Errors {
  const errors: Errors = {};
  if (!category) errors.category = "Choose what this is about";
  const s = subject.trim();
  if (s.length < 5) errors.subject = "Write a short subject, at least 5 characters";
  else if (s.length > 120) errors.subject = "Keep the subject under 120 characters";
  const m = message.trim();
  if (m.length < 10) errors.message = "Describe the problem in at least 10 characters";
  else if (m.length > 5000) errors.message = "Keep the message under 5000 characters";
  return errors;
}

/** Form for a new support request: topic, subject, details and optional screenshots. */
export function NewTicketSheet({ visible, onClose, onCreated }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const create = useCreateTicket();
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const reset = (): void => {
    setCategory(null);
    setSubject("");
    setMessage("");
    setFiles([]);
    setErrors({});
    setServerError(null);
  };

  const submit = (): void => {
    const found = validate(category, subject, message);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0 || !category) return;
    create.mutate(
      { category, subject, message, attachments: files },
      {
        onSuccess: ({ ticket }) => {
          toast(`Request ${ticket.reference} sent`, "success");
          reset();
          onCreated(ticket);
        },
        onError: (error: Error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
            setErrors({
              subject: error.fieldErrors.subject,
              message: error.fieldErrors.message,
              category: error.fieldErrors.category,
            });
          }
          setServerError(errorMessage(error));
        },
      },
    );
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title="Contact support">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={{
          gap: theme.spacing[4],
          paddingHorizontal: theme.spacing[4],
          paddingBottom: theme.spacing[2],
        }}
      >
        <AppText tone="secondary">
          Tell us what happened. Screenshots help us sort it out faster.
        </AppText>
        {serverError ? <AppCallout tone="danger">{serverError}</AppCallout> : null}
        <AppSelect
          label="What is this about?"
          placeholder="Choose a topic"
          required
          options={TICKET_CATEGORIES}
          value={category}
          error={errors.category}
          onChange={(v) => {
            setCategory(v);
            setErrors((e) => ({ ...e, category: undefined }));
          }}
        />
        <AppInput
          label="Subject"
          required
          placeholder="e.g. My phone number is showing wrong"
          maxLength={120}
          value={subject}
          error={errors.subject}
          onChangeText={(v) => {
            setSubject(v);
            setErrors((e) => ({ ...e, subject: undefined }));
          }}
          returnKeyType="next"
        />
        <AppInput
          label="Details"
          required
          multiline
          maxLength={5000}
          value={message}
          error={errors.message}
          onChangeText={(v) => {
            setMessage(v);
            setErrors((e) => ({ ...e, message: undefined }));
          }}
        />
        <AttachmentPicker files={files} onChange={setFiles} onBusyChange={setUploading} />
        <View style={[styles.row, { gap: theme.spacing[3] }]}>
          <AppButton variant="secondary" style={styles.flex} onPress={onClose}>
            Cancel
          </AppButton>
          <AppButton
            style={styles.flex}
            loading={create.isPending}
            disabled={uploading}
            onPress={submit}
          >
            Send request
          </AppButton>
        </View>
      </ScrollView>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  row: { flexDirection: "row" },
  flex: { flex: 1 },
});
