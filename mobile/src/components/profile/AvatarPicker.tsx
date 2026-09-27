import { StyleSheet, View } from "react-native";
import { Camera } from "lucide-react-native";

import { AppAvatar, AppButton, AppPressable } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useUpload } from "@/hooks/useUpload";
import { errorMessage } from "@/services/api";
import type { SessionUser } from "@/types";

/** The profile photo: tap to choose a new one (uploaded and saved straight away), or remove it. */
export function AvatarPicker({ user }: { user: SessionUser }) {
  const theme = useTheme();
  const toast = useToast();
  const { progress, choose } = useUpload("avatar");
  const update = useUpdateProfile();
  const busy = progress !== null || update.isPending;

  const save = (profilePhotoUrl: string | null, done: string): void =>
    update.mutate(
      { profilePhotoUrl },
      {
        onSuccess: () => toast(done, "success"),
        onError: (error: Error) => toast(errorMessage(error), "error"),
      },
    );

  const pick = async (): Promise<void> => {
    const url = await choose("library");
    if (url) save(url, "Profile photo updated");
  };

  return (
    <View style={[styles.wrapper, { gap: theme.spacing[2] }]}>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        disabled={busy}
        onPress={() => void pick()}
      >
        <AppAvatar
          name={user.name}
          uri={user.profilePhotoUrl}
          size={104}
          ringColor={theme.colors.background.elevated}
        />
        <View
          style={[
            styles.camera,
            {
              backgroundColor: theme.colors.brand.primary,
              borderColor: theme.colors.background.primary,
            },
            theme.shadow.md,
          ]}
        >
          <Camera size={16} color={theme.components.button.primary.text} strokeWidth={2.2} />
        </View>
      </AppPressable>
      {progress !== null ? (
        <View style={styles.progress}>
          <AppProgress value={progress} />
        </View>
      ) : null}
      {user.profilePhotoUrl && !busy ? (
        <AppButton variant="ghost" size="sm" onPress={() => save(null, "Profile photo removed")}>
          Remove photo
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  progress: { width: 120 },
  camera: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 3,
    bottom: 2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 34,
  },
});
