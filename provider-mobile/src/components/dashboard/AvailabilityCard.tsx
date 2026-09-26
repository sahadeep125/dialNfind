import { View } from "react-native";

import { AppCard } from "@/components/design-system";
import { AppSwitchRow } from "@/components/forms";
import { useSetAvailability } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";

/** The daily on/off switch: unavailable listings rank lower until switched back on. */
export function AvailabilityCard({ isAvailable }: { isAvailable: boolean }) {
  const theme = useTheme();
  const toast = useToast();
  const set = useSetAvailability();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing[1] }}>
        <AppSwitchRow
          label={isAvailable ? "Available for work" : "Unavailable"}
          description={isAvailable ? "Customers see you are taking new jobs." : "You rank lower in search until you switch this back on."}
          value={isAvailable}
          disabled={set.isPending}
          onValueChange={(v) =>
            set.mutate(v, {
              onSuccess: () => toast(v ? "You are shown as available" : "Marked as unavailable", "success"),
              onError: (error: Error) => toast(errorMessage(error), "error"),
            })
          }
        />
      </View>
    </AppCard>
  );
}
