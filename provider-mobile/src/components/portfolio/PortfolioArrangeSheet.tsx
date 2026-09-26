import { View } from "react-native";
import { ArrowDown, ArrowUp, Star } from "lucide-react-native";

import { AppButton, AppSheet, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";
import type { PortfolioItem } from "@/types";

interface Props {
  item: PortfolioItem | null;
  /** Position in the list as shown (the cover is always first). */
  index: number;
  count: number;
  /** The first position a non-cover photo can take. */
  firstMovable: number;
  busy: boolean;
  onMove: (item: PortfolioItem, by: -1 | 1) => void;
  onCover: (item: PortfolioItem) => void;
  onClose: () => void;
}

/** Move a photo earlier or later, or make it the cover shown first on the listing. */
export function PortfolioArrangeSheet({ item, index, count, firstMovable, busy, onMove, onCover, onClose }: Props) {
  const theme = useTheme();
  return (
    <AppSheet visible={!!item} onClose={onClose} title={item ? item.title : "Arrange photo"}>
      <View style={{ gap: theme.spacing[3], padding: theme.spacing[4], paddingTop: 0 }}>
        {item?.isCover ? (
          <AppText tone="secondary">This is your cover photo. It always shows first on your listing.</AppText>
        ) : (
          <AppText tone="secondary">{`Photo ${index + 1} of ${count}. Customers see them in this order.`}</AppText>
        )}
        {item && !item.isCover ? (
          <>
            <AppButton
              variant="secondary"
              fullWidth
              disabled={busy || index <= firstMovable}
              leadingIcon={<ArrowUp size={16} color={theme.colors.text.primary} />}
              onPress={() => onMove(item, -1)}
            >
              Move earlier
            </AppButton>
            <AppButton
              variant="secondary"
              fullWidth
              disabled={busy || index >= count - 1}
              leadingIcon={<ArrowDown size={16} color={theme.colors.text.primary} />}
              onPress={() => onMove(item, 1)}
            >
              Move later
            </AppButton>
            <AppButton
              fullWidth
              disabled={busy}
              leadingIcon={<Star size={16} color={theme.components.button.primary.text} />}
              onPress={() => onCover(item)}
            >
              Set as cover photo
            </AppButton>
          </>
        ) : null}
      </View>
    </AppSheet>
  );
}
