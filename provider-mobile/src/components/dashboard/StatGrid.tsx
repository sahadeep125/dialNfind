import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface Props {
  columns: number;
  children: ReactNode;
}

/** Equal-width grid built from rows, so cards line up at any screen width without fixed sizes. */
export function StatGrid({ columns, children }: Props) {
  const theme = useTheme();
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: theme.spacing[3] }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap: theme.spacing[3] }]}>
          {row.map((item, c) => (
            <View key={c} style={styles.cell}>
              {item}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  cell: { flex: 1, minWidth: 0 },
});
