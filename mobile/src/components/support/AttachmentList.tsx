import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { FileText, X } from "lucide-react-native";

import { AppPressable } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { openUrl } from "@/services/links";

interface Props {
  urls: string[];
  onRemove?: (url: string) => void;
}

const SIZE = 64;

/** Thumbnails of attached images and PDFs. Tap to open; pass onRemove to show a remove button. */
export function AttachmentList({ urls, onRemove }: Props) {
  const theme = useTheme();
  const toast = useToast();

  const open = async (url: string): Promise<void> => {
    try {
      await openUrl(url);
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <View style={[styles.row, { gap: theme.spacing[2] }]}>
      {urls.map((url) => {
        const isPdf = /\.pdf($|\?)/i.test(url);
        return (
          <View key={url}>
            <AppPressable
              accessibilityRole="link"
              accessibilityLabel={isPdf ? "Open PDF attachment" : "Open image attachment"}
              onPress={() => void open(url)}
              style={[
                styles.thumb,
                {
                  borderRadius: theme.radius.sm,
                  borderColor: theme.colors.border.primary,
                  backgroundColor: theme.colors.background.tertiary,
                },
              ]}
            >
              {isPdf ? (
                <FileText size={24} color={theme.colors.brand.primary} />
              ) : (
                <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
              )}
            </AppPressable>
            {onRemove ? (
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel="Remove attachment"
                hitSlop={10}
                onPress={() => onRemove(url)}
                style={[styles.remove, { backgroundColor: theme.colors.text.primary }]}
              >
                <X size={12} color={theme.colors.background.primary} />
              </AppPressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
  thumb: {
    alignItems: "center",
    borderWidth: 1,
    height: SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: SIZE,
  },
  image: { height: SIZE, width: SIZE },
  remove: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
  },
});
