import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FileText } from "lucide-react-native";

import { AppButton, AppCallout, AppCard, AppText } from "@/components/design-system";
import { DocumentUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ClaimListing } from "@/types/onboarding";
import { ListingRow } from "./ListingRow";

interface Props {
  listing: ClaimListing;
  busy: boolean;
  onStart: (documentUrl: string) => void;
  onChooseAnother: () => void;
}

/** Shows the chosen listing and asks for a document that proves ownership. */
export function ClaimConfirm({ listing, busy, onStart, onChooseAnother }: Props) {
  const theme = useTheme();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const submitDocument = (): void => {
    if (!docUrl) {
      setDocError("Upload a document before submitting");
      return;
    }
    onStart(docUrl);
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
          <AppCard variant="flat" style={{ gap: theme.spacing[2] }}>
            <View style={styles.title}>
              <FileText size={18} color={theme.colors.brand.primary} />
              <AppText variant="label">Prove that you own this business</AppText>
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
              style={styles.start}
              loading={busy}
              disabled={busy}
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
