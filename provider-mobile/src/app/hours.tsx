import { HoursEditor } from "@/components/hours/HoursEditor";
import { ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { useProfile } from "@/hooks/useProfile";

export default function HoursScreen() {
  const profile = useProfile();
  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Working hours" subtitle="Shown in India Standard Time" />
      {profile.data ? (
        <HoursEditor saved={profile.data.businessHours} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileSkeleton cards={2} />
      )}
    </Screen>
  );
}
