import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppBadge, AppButton, AppCard, AppText } from "@/components/design-system";
import { DocumentUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useSubmitVerification } from "@/hooks/useVerifications";
import { errorMessage } from "@/services/api";
import type { Verification } from "@/types/listing";
import { formatDate } from "@/utils/format";
import type { VerificationTypeInfo } from "./verificationTypes";

interface Props {
  info: VerificationTypeInfo;
  latest?: Verification;
}

/** One kind of proof: its latest review result, and an upload form when a new one is allowed. */
export function VerificationCard({ info, latest }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const submit = useSubmitVerification();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = !latest || latest.status === "rejected";
  const Icon = info.icon;

  const send = (): void => {
    if (!url) {
      setError("Upload a document before submitting");
      return;
    }
    submit.mutate(
      { type: info.type, documentUrl: url },
      {
        onSuccess: () => {
          setUrl(null);
          toast("Document submitted for review", "success");
        },
        onError: (e: Error) => toast(errorMessage(e), "error"),
      },
    );
  };

  const badge = !latest ? null : latest.status === "approved" ? (
    <AppBadge label="Approved" tone="success" dot />
  ) : latest.status === "pending" ? (
    <AppBadge label="In review" tone="warning" dot />
  ) : (
    <AppBadge label="Not accepted" tone="danger" dot />
  );
  const note = !latest
    ? null
    : latest.status === "approved"
      ? latest.verifiedAt
        ? `Approved on ${formatDate(latest.verifiedAt)}`
        : null
      : latest.status === "pending"
        ? `Sent ${formatDate(latest.createdAt)}. We review within two working days.`
        : latest.notes;

  return (
    <AppCard padding={14}>
      <View style={{ gap: theme.spacing[3] }}>
        <View style={[styles.head, { gap: theme.spacing[3] }]}>
          <View
            style={[
              styles.icon,
              {
                backgroundColor: theme.colors.background.subtle,
                borderRadius: theme.radius.sm + 2,
              },
            ]}
          >
            <Icon size={16} color={theme.colors.text.secondary} />
          </View>
          <View style={[styles.flex, { gap: 2 }]}>
            <View style={[styles.line, { gap: theme.spacing[2] }]}>
              <AppText variant="label" style={styles.flex}>
                {info.title}
              </AppText>
              {badge}
            </View>
            <AppText variant="meta" tone="secondary">
              {note ?? info.text}
            </AppText>
          </View>
        </View>

        {canSubmit ? (
          <View style={{ gap: theme.spacing[3] }}>
            <DocumentUploadField
              label={latest ? "Upload a new document" : "Document"}
              helper="PDF or photo, up to 10 MB"
              value={url}
              onChange={(v) => {
                setUrl(v);
                if (v) setError(null);
              }}
            />
            {error ? (
              <AppText variant="meta" tone="danger" accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : null}
            <AppButton
              variant="secondary"
              size="sm"
              loading={submit.isPending}
              onPress={send}
              style={{ alignSelf: "flex-start" }}
            >
              {latest ? "Submit again" : "Submit for review"}
            </AppButton>
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "flex-start", flexDirection: "row" },
  icon: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  flex: { flex: 1 },
  line: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
});
