import { forwardRef, useState, type ComponentProps } from "react";
import type { TextInput } from "react-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";

import { AppInput } from "@/components/design-system";
import { useTheme } from "@/hooks/useTheme";

type Props = Omit<
  ComponentProps<typeof AppInput>,
  "secureTextEntry" | "trailingAction" | "leadingIcon"
>;

/** Password field with a show or hide toggle. */
export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(props, ref) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <AppInput
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      leadingIcon={<Lock size={18} color={theme.colors.text.tertiary} />}
      trailingAction={{
        icon: <Icon size={18} color={theme.colors.text.tertiary} />,
        onPress: () => setVisible((v) => !v),
        accessibilityLabel: visible ? "Hide password" : "Show password",
      }}
      {...props}
    />
  );
});
