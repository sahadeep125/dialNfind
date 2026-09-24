import { Heart } from "lucide-react-native";

import { AppIconButton } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";

interface Props {
  providerId: number;
  businessName: string;
  isFavorite: boolean;
  variant?: "surface" | "ghost";
}

export function FavoriteButton({ providerId, businessName, isFavorite, variant = "ghost" }: Props) {
  const theme = useTheme();
  const { toggle, isPending } = useToggleFavorite();
  return (
    <AppIconButton
      accessibilityLabel={
        isFavorite ? `Remove ${businessName} from favorites` : `Save ${businessName} to favorites`
      }
      variant={variant}
      disabled={isPending}
      onPress={() => toggle({ providerId, isFavorite })}
      icon={
        <Heart
          size={20}
          color={isFavorite ? theme.colors.semantic.danger : theme.colors.text.secondary}
          fill={isFavorite ? theme.colors.semantic.danger : "transparent"}
        />
      }
    />
  );
}
