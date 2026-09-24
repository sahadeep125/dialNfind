import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";

import { AppButton } from "@/components/design-system";
import { EmptyState } from "@/components/layout";

interface Props {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Shown on tabs that need an account, so guests can still browse everything else. */
export function SignInPrompt({ icon, title, text }: Props) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      text={text}
      action={
        <>
          <AppButton onPress={() => router.push("/login")} fullWidth>
            Sign in
          </AppButton>
          <AppButton variant="ghost" onPress={() => router.push("/register")} fullWidth>
            Create an account
          </AppButton>
        </>
      }
    />
  );
}
