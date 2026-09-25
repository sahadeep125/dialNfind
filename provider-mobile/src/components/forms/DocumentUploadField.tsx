import { StyleSheet, View } from "react-native";
import { Camera, FileCheck2, FileUp } from "lucide-react-native";

import { AppButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useUpload } from "@/hooks/useUpload";
import { AppProgress } from "./AppProgress";

interface Props {
  label: string;
  helper?: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

/** Picks a PDF or image (or takes a photo of the paper) and uploads it as a private document. */
export function DocumentUploadField({ label, helper, value, onChange }: Props) {
  const theme = useTheme();
  const { progress, choose } = useUpload("document");
  const busy = progress !== null;

  const pick = async (source: "library" | "camera"): Promise<void> => {
    const url = await choose(source);
    if (url) onChange(url);
  };

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      {value ? (
        <View
          style={[
            styles.file,
            {
              gap: theme.spacing[2],
              padding: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.semantic.successSoft,
            },
          ]}
        >
          <FileCheck2 size={18} color={theme.colors.semantic.success} />
          <AppText variant="caption" tone="success" numberOfLines={1} style={styles.flex}>
            {decodeURIComponent(value.split("/").pop() ?? "Document uploaded")}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.row, { gap: theme.spacing[2] }]}>
        <AppButton
          size="sm"
          variant="secondary"
          loading={busy}
          leadingIcon={<FileUp size={16} color={theme.colors.text.primary} />}
          onPress={() => void pick("library")}
        >
          {value ? "Replace file" : "Choose file"}
        </AppButton>
        <AppButton
          size="sm"
          variant="ghost"
          disabled={busy}
          leadingIcon={<Camera size={16} color={theme.colors.text.primary} />}
          onPress={() => void pick("camera")}
        >
          Take photo
        </AppButton>
      </View>
      {busy ? <AppProgress value={progress ?? 0} height={4} /> : null}
      {helper ? (
        <AppText variant="caption" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  file: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
});
