import { RotateCw, WifiOff } from "lucide-react-native";

import { AppButton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { errorMessage } from "@/services/api";
import { EmptyState } from "./EmptyState";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: Props) {
  const theme = useTheme();
  return (
    <EmptyState
      icon={WifiOff}
      title="Could not load this"
      text={errorMessage(error)}
      action={
        <AppButton
          variant="secondary"
          size="sm"
          leadingIcon={<RotateCw size={14} color={theme.colors.text.primary} />}
          onPress={onRetry}
        >
          Try again
        </AppButton>
      }
    />
  );
}
