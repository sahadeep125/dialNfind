import { WifiOff } from "lucide-react-native";

import { AppButton } from "@/components/design-system";
import { errorMessage } from "@/services/api";
import { EmptyState } from "./EmptyState";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: Props) {
  return (
    <EmptyState
      icon={WifiOff}
      title="Could not load this"
      text={errorMessage(error)}
      action={
        <AppButton variant="secondary" onPress={onRetry}>
          Try again
        </AppButton>
      }
    />
  );
}
