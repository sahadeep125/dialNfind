import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { CheckCircle2, Clock, XCircle } from "lucide-react-native";

import { AppButton, AppCard, AppText } from "@/components/design-system";
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

  return (
    <AppCard>
      <View style={{ gap: theme.spacing[3] }}>
        <View style={[styles.head, { gap: theme.spacing[3] }]}>
          <View
            style={[
              styles.icon,
              { backgroundColor: theme.colors.brand.soft, borderRadius: theme.radius.md },
            ]}
          >
            <Icon size={20} color={theme.colors.brand.primary} />
          </View>
          <View style={[styles.flex, { gap: theme.spacing[0.5] }]}>
            <AppText variant="label">{info.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {info.text}
            </AppText>
          </View>
        </View>

        {latest ? (
          <View
            style={{
              gap: theme.spacing[1],
              padding: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.background.tertiary,
            }}
          >
            {latest.status === "approved" ? (
              <View style={[styles.line, { gap: theme.spacing[1.5] }]}>
                <CheckCircle2 size={16} color={theme.colors.semantic.success} />
                <AppText variant="label" tone="success">
                  Approved{latest.verifiedAt ? ` ${formatDate(latest.verifiedAt)}` : ""}
                </AppText>
              </View>
            ) : latest.status === "pending" ? (
              <View style={[styles.line, { gap: theme.spacing[1.5] }]}>
                <Clock size={16} color={theme.colors.semantic.warning} />
                <AppText variant="label">Under review since {formatDate(latest.createdAt)}</AppText>
              </View>
            ) : (
              <>
                <View style={[styles.line, { gap: theme.spacing[1.5] }]}>
                  <XCircle size={16} color={theme.colors.semantic.danger} />
                  <AppText variant="label" tone="danger">
                    Not accepted
                  </AppText>
                </View>
                {latest.notes ? (
                  <AppText variant="caption" tone="secondary">
                    {latest.notes}
                  </AppText>
                ) : null}
              </>
            )}
          </View>
        ) : null}

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
              <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : null}
            <AppButton variant="secondary" fullWidth loading={submit.isPending} onPress={send}>
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
  icon: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  flex: { flex: 1 },
  line: { alignItems: "center", flexDirection: "row", flexWrap: "wrap" },
});
