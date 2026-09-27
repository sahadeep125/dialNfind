import { StyleSheet, View } from "react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  steps: readonly string[];
  current: number;
  /** Called with an earlier step's index when the person taps it. */
  onJump: (index: number) => void;
}

/** Segmented progress: one bar per step. Finished steps can be tapped to go back to them. */
export function StepIndicator({ steps, current, onJump }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <View style={[styles.row, { gap: theme.spacing[1] }]}>
        {steps.map((name, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <AppPressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}, ${name}${done ? ", done" : active ? ", current" : ""}`}
              accessibilityState={{ disabled: !done, selected: active }}
              disabled={!done}
              hitSlop={{ top: 12, bottom: 12 }}
              onPress={() => onJump(i)}
              scale={false}
              style={[
                styles.bar,
                {
                  backgroundColor:
                    done || active ? theme.colors.brand.primary : theme.colors.background.subtle,
                  opacity: done ? 0.55 : 1,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        <AppText
          variant="caption"
          tone="brand"
          style={{ fontFamily: theme.typography.label.fontFamily }}
        >
          {steps[current]}
        </AppText>
        <AppText variant="meta" numeric>
          {`${current + 1} of ${steps.length}`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  bar: { borderRadius: 2, flex: 1, height: 4 },
  labels: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
