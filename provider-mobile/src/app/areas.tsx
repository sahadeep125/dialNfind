import { AreasEditor } from "@/components/areas/AreasEditor";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { useProfile } from "@/hooks/useProfile";

export default function AreasScreen() {
  const profile = useProfile();
  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Service areas" subtitle="Where you take work" />
      {profile.data ? (
        <AreasEditor profile={profile.data} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileSkeleton cards={2} />
      )}
    </Screen>
  );
}
