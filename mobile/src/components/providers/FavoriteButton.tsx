import { Heart } from "lucide-react-native";

import { AppIconButton, type IconButtonVariant } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";

interface Props {
  providerId: number;
  businessName: string;
  isFavorite: boolean;
  variant?: IconButtonVariant;
  size?: "sm" | "md";
}

export function FavoriteButton({
  providerId,
  businessName,
  isFavorite,
  variant = "ghost",
  size = "md",
}: Props) {
  const theme = useTheme();
  const { toggle, isPending } = useToggleFavorite();
  // Over a photo the button is a white disc, so its outline must stay dark in both themes.
  const idle = variant === "overlay" ? theme.colors.contrast.onOverlay : theme.colors.text.tertiary;
  return (
    <AppIconButton
      accessibilityLabel={
        isFavorite ? `Remove ${businessName} from favorites` : `Save ${businessName} to favorites`
      }
      variant={variant}
      size={size}
      disabled={isPending}
      onPress={() => toggle({ providerId, isFavorite })}
      icon={
        <Heart
          size={size === "sm" ? 20 : 21}
          color={isFavorite ? theme.colors.semantic.danger : idle}
          fill={isFavorite ? theme.colors.semantic.danger : "transparent"}
          strokeWidth={2.2}
        />
      }
    />
  );
}
