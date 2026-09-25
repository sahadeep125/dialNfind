import { useWindowDimensions } from "react-native";

import { MAX_CONTENT_WIDTH } from "@/constants/spacing";

interface Layout {
  width: number;
  isTablet: boolean;
  contentWidth: number;
  /** Columns for card grids: one on phones, two on large phones in landscape and small tablets, three on big tablets. */
  columns: number;
}

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const columns = width >= 1024 ? 3 : width >= 700 ? 2 : 1;
  return {
    width,
    isTablet,
    contentWidth: Math.min(width, columns > 1 ? width : MAX_CONTENT_WIDTH),
    columns,
  };
}
