import type { ReactNode } from "react";
import { View } from "react-native";

import { AppCard, AppSection } from "@/components/design-system";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled group of form fields: the title sits above, the fields share one card. */
export function FormSection({ title, description, children }: Props) {
  return (
    <AppSection title={title} subtitle={description} kind="plain">
      <AppCard>
        <View style={{ gap: 14 }}>{children}</View>
      </AppCard>
    </AppSection>
  );
}
