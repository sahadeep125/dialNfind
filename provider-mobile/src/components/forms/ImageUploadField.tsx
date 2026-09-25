import { Image, StyleSheet, View } from "react-native";
import { Camera, ImagePlus, Trash2 } from "lucide-react-native";

import { AppButton, AppIconButton, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useUpload } from "@/hooks/useUpload";
import type { UploadPurpose } from "@/types";
import { AppProgress } from "./AppProgress";

interface Props {
  label: string;
  helper?: string;
  purpose: Extract<UploadPurpose, "logo" | "cover" | "portfolio" | "avatar">;
  value: string | null;
  onChange: (url: string | null) => void;
}

/** Shows the current image, lets the owner pick or take a new one, and uploads it straight away. */
export function ImageUploadField({ label, helper, purpose, value, onChange }: Props) {
  const theme = useTheme();
  const { progress, choose } = useUpload(purpose);
  const square = purpose === "logo" || purpose === "avatar";
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
      <View style={[styles.row, { gap: theme.spacing[3] }]}>
        <View
          style={[
            styles.preview,
            square ? styles.square : styles.wide,
            {
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.background.tertiary,
              borderColor: theme.colors.border.primary,
            },
          ]}
        >
          {value ? (
            <Image
              source={{ uri: value }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityLabel={label}
            />
          ) : (
            <ImagePlus size={24} color={theme.colors.text.tertiary} />
          )}
        </View>
        <View style={[styles.actions, { gap: theme.spacing[2] }]}>
          <AppButton
            size="sm"
            variant="secondary"
            loading={busy}
            leadingIcon={<ImagePlus size={16} color={theme.colors.text.primary} />}
            onPress={() => void pick("library")}
          >
            {value ? "Replace" : "Choose image"}
          </AppButton>
          <View style={[styles.row, { gap: theme.spacing[2] }]}>
            <AppIconButton
              size="sm"
              variant="surface"
              accessibilityLabel="Take a photo"
              disabled={busy}
              icon={<Camera size={16} color={theme.colors.text.primary} />}
              onPress={() => void pick("camera")}
            />
            {value ? (
              <AppIconButton
                size="sm"
                variant="surface"
                accessibilityLabel={`Remove ${label.toLowerCase()}`}
                disabled={busy}
                icon={<Trash2 size={16} color={theme.colors.semantic.danger} />}
                onPress={() => onChange(null)}
              />
            ) : null}
          </View>
        </View>
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
  row: { alignItems: "center", flexDirection: "row" },
  preview: { alignItems: "center", borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  square: { height: 88, width: 88 },
  wide: { aspectRatio: 16 / 9, width: 156 },
  actions: { alignItems: "flex-start", flex: 1 },
});
