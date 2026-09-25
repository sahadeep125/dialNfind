import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { AppPressable, AppText } from "@/components/design-system";
import { AppProgress } from "@/components/forms";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  steps: readonly string[];
  current: number;
  /** Called with an earlier step's index when the person taps it. */
  onJump: (index: number) => void;
}

/** Progress bar plus numbered steps. Finished steps can be tapped to go back to them. */
export function StepIndicator({ steps, current, onJump }: Props) {
  const theme = useTheme();
  const { width } = useLayout();
  // Step names fit beside the dots from small tablets up; phones show only the current name.
  const showNames = width >= 600;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <View style={styles.row}>
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
              hitSlop={6}
              onPress={() => onJump(i)}
              style={[styles.step, { gap: theme.spacing[1.5] }]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done
                      ? theme.colors.semantic.success
                      : active
                        ? theme.colors.brand.primary
                        : theme.colors.background.tertiary,
                  },
                ]}
              >
                {done ? (
                  <Check size={14} color={theme.components.button.primary.text} strokeWidth={3} />
                ) : (
                  <AppText
                    variant="caption"
                    tone={active ? "white" : "secondary"}
                    style={{ fontFamily: theme.typography.label.fontFamily }}
                  >
                    {String(i + 1)}
                  </AppText>
                )}
              </View>
              {showNames ? (
                <AppText
                  variant="caption"
                  tone={active ? "primary" : "secondary"}
                  numberOfLines={1}
                >
                  {name}
                </AppText>
              ) : null}
            </AppPressable>
          );
        })}
      </View>
      <AppProgress value={((current + 1) / steps.length) * 100} height={6} />
      {!showNames ? (
        <AppText variant="caption" tone="secondary">
          {`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  step: { alignItems: "center", flexDirection: "row", flexShrink: 1, minHeight: 32 },
  dot: { alignItems: "center", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
});
