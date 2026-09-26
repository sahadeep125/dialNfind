import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus, X } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import { useUpload } from "@/hooks/useUpload";

/** The API accepts up to six photos per review (server/src/routes/reviews.ts). */
export const MAX_REVIEW_PHOTOS = 6;

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
}

/** Optional photos of the work, uploaded as soon as they are chosen. */
export function ReviewPhotosField({ photos, onChange }: Props) {
  const theme = useTheme();
  const { progress, choose } = useUpload("review");
  const uploading = progress !== null;

  const add = async (): Promise<void> => {
    const url = await choose("library");
    if (url) onChange([...photos, url].slice(0, MAX_REVIEW_PHOTOS));
  };

  const tile = { borderRadius: theme.radius.md, backgroundColor: theme.colors.background.tertiary };

  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppText variant="label" tone="secondary">
        Photos (optional)
      </AppText>
      <View style={styles.grid}>
        {photos.map((uri, i) => (
          <View key={uri} style={[styles.tile, tile]}>
            <Image source={{ uri }} style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]} contentFit="cover" />
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
              hitSlop={8}
              onPress={() => onChange(photos.filter((p) => p !== uri))}
              style={[styles.remove, { backgroundColor: theme.colors.background.elevated }]}
            >
              <X size={14} color={theme.colors.text.primary} />
            </AppPressable>
          </View>
        ))}
        {photos.length < MAX_REVIEW_PHOTOS ? (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            disabled={uploading}
            onPress={() => void add()}
            style={[styles.tile, styles.add, tile, { borderColor: theme.colors.border.primary }]}
          >
            {uploading ? (
              <View style={styles.progress}>
                <AppProgress value={progress ?? 0} height={6} />
              </View>
            ) : (
              <ImagePlus size={22} color={theme.colors.brand.primary} />
            )}
          </AppPressable>
        ) : null}
      </View>
      <AppText variant="caption" tone="tertiary">
        Up to {MAX_REVIEW_PHOTOS} photos of the finished work. JPG, PNG or WebP, 5 MB each.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { height: 76, overflow: "hidden", width: 76 },
  add: { alignItems: "center", borderStyle: "dashed", borderWidth: 1, justifyContent: "center" },
  remove: {
    alignItems: "center",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 22,
  },
  progress: { width: 56 },
});
