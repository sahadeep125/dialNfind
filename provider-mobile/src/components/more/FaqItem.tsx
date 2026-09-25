import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ChevronDown } from "lucide-react-native";

import { AppDivider, AppPressable, AppText } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  index: number;
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: (index: number) => void;
}

/** One question in the help accordion. */
export const FaqItem = memo(function FaqItem({
  index,
  question,
  answer,
  expanded,
  onToggle,
}: Props) {
  const theme = useTheme();
  return (
    <View>
      {index > 0 ? <AppDivider /> : null}
      <AppPressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        scale={false}
        onPress={() => onToggle(index)}
        style={[styles.question, { gap: theme.spacing[3], padding: theme.spacing[4] }]}
      >
        <AppText variant="label" style={styles.flex}>
          {question}
        </AppText>
        <ChevronDown
          size={18}
          color={theme.colors.text.tertiary}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </AppPressable>
      {expanded ? (
        <AppText
          tone="secondary"
          style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[4] }}
        >
          {answer}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  question: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
});
