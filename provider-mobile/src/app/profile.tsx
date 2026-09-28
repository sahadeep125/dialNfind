import { ExternalLink } from "lucide-react-native";

import { AppIconButton } from "@/components/design-system";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { openPublicProfile } from "@/services/links";

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const slug = profile.data?.slug;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Business details"
        subtitle="What customers see on your page"
        right={
          slug ? (
            <AppIconButton
              accessibilityLabel="View public profile"
              icon={<ExternalLink size={18} color={theme.colors.text.primary} />}
              onPress={() => void openPublicProfile(slug, profile.data?.status).catch(() => undefined)}
            />
          ) : undefined
        }
      />
      {profile.data ? (
        <ProfileEditor profile={profile.data} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileSkeleton />
      )}
    </Screen>
  );
}
