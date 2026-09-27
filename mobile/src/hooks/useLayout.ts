import { useWindowDimensions } from "react-native";

import { breakpoints, gutters, MAX_CONTENT_WIDTH, MAX_GRID_WIDTH } from "@/constants/spacing";

export type SizeClass = "compact" | "medium" | "expanded";

interface Layout {
  width: number;
  height: number;
  /** compact: phones. medium: small tablets and landscape phones. expanded: large tablets. */
  sizeClass: SizeClass;
  isTablet: boolean;
  /** Horizontal page padding for this size class. */
  gutter: number;
  contentWidth: number;
  /** Columns for card grids: one on phones, two on small tablets, three on big tablets. */
  columns: number;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const sizeClass: SizeClass =
    width >= breakpoints.expanded ? "expanded" : width >= breakpoints.medium ? "medium" : "compact";
  const columns = width >= 1024 ? 3 : width >= 700 ? 2 : 1;
  return {
    width,
    height,
    sizeClass,
    isTablet: width >= 700,
    gutter: gutters[sizeClass],
    contentWidth: Math.min(width, columns > 1 ? MAX_GRID_WIDTH : MAX_CONTENT_WIDTH),
    columns,
  };
}
