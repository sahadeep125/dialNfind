import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FileText, ShieldCheck } from "lucide-react-native";

import { AppButton, AppCallout, AppCard, AppText } from "@/components/design-system";
import { DocumentUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ClaimListing, ClaimMethod } from "@/types/onboarding";
import { ListingRow } from "./ListingRow";

interface Props {
  listing: ClaimListing;
  busy: ClaimMethod | null;
  onStart: (method: ClaimMethod, documentUrl?: string) => void;
  onChooseAnother: () => void;
}

/** Shows the chosen listing and the two ways to prove ownership: a code by SMS, or a document. */
export function ClaimConfirm({ listing, busy, onStart, onChooseAnother }: Props) {
  const theme = useTheme();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const submitDocument = (): void => {
    if (!docUrl) {
      setDocError("Upload a document before submitting");
      return;
    }
    onStart("document", docUrl);
  };

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <ListingRow listing={listing} />
      {listing.isClaimed ? (
        <AppCallout tone="warning" title="Already claimed">
          This listing already has an owner. If you believe that is wrong, contact
          support@dialnfind.com.
        </AppCallout>
      ) : (
        <>
          <AppCard variant="tinted" style={{ gap: theme.spacing[2] }}>
            <View style={styles.title}>
              <ShieldCheck size={18} color={theme.colors.brand.primary} />
              <AppText variant="label">Verify by phone</AppText>
            </View>
            <AppText variant="caption" tone="secondary">
              {`We will send a 6-digit code to ${listing.phone}, the number on this listing.`}
            </AppText>
            <AppButton
              style={styles.start}
              loading={busy === "phone_otp"}
              disabled={busy !== null}
              onPress={() => onStart("phone_otp")}
            >
              Send code
            </AppButton>
          </AppCard>
          <AppCard variant="flat" style={{ gap: theme.spacing[2] }}>
            <View style={styles.title}>
              <FileText size={18} color={theme.colors.brand.primary} />
              <AppText variant="label">No access to that number?</AppText>
            </View>
            <AppText variant="caption" tone="secondary">
              Upload a trade licence, GST certificate or shop registration. Our team reviews it
              within two working days.
            </AppText>
            <DocumentUploadField
              label="Proof of ownership"
              value={docUrl}
              onChange={(url) => {
                setDocUrl(url);
                if (url) setDocError(null);
              }}
            />
            {docError ? (
              <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {docError}
              </AppText>
            ) : null}
            <AppButton
              variant="secondary"
              style={styles.start}
              loading={busy === "document"}
              disabled={busy !== null}
              onPress={submitDocument}
            >
              Submit document
            </AppButton>
          </AppCard>
        </>
      )}
      <AppButton variant="ghost" onPress={onChooseAnother}>
        Choose a different listing
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { alignItems: "center", flexDirection: "row", gap: 8 },
  start: { alignSelf: "flex-start", marginTop: 4 },
});
