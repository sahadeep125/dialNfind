import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Camera, Paperclip } from "lucide-react-native";

import { AppButton, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import { useUpload } from "@/hooks/useUpload";

import { AttachmentList } from "./AttachmentList";
import { MAX_ATTACHMENTS } from "./ticketMeta";

interface Props {
  files: string[];
  onChange: (files: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
}

/** Adds up to five screenshots or PDFs to a support message. */
export function AttachmentPicker({ files, onChange, onBusyChange }: Props) {
  const theme = useTheme();
  const { progress, choose } = useUpload("document");
  const busy = progress !== null;
  const full = files.length >= MAX_ATTACHMENTS;
  const iconColor = theme.colors.text.primary;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const pick = async (source: "library" | "camera"): Promise<void> => {
    const url = await choose(source);
    if (url) onChange([...files, url].slice(0, MAX_ATTACHMENTS));
  };

  return (
    <View style={{ gap: theme.spacing[2] }}>
      {files.length > 0 ? (
        <View style={{ paddingTop: theme.spacing[1] }}>
          <AttachmentList urls={files} onRemove={(u) => onChange(files.filter((f) => f !== u))} />
        </View>
      ) : null}
      <View style={[styles.row, { gap: theme.spacing[2] }]}>
        <AppButton
          size="sm"
          variant="secondary"
          loading={busy}
          disabled={full}
          leadingIcon={<Paperclip size={14} color={iconColor} />}
          onPress={() => void pick("library")}
        >
          Attach a file
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          disabled={busy || full}
          leadingIcon={<Camera size={14} color={iconColor} />}
          onPress={() => void pick("camera")}
        >
          Take photo
        </AppButton>
      </View>
      {busy ? <AppProgress value={progress ?? 0} height={4} /> : null}
      <AppText variant="caption" tone="tertiary">
        JPG, PNG, WebP or PDF, up to 10 MB, {MAX_ATTACHMENTS} files
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
});
