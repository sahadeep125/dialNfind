import { useState } from "react";
import { ScrollView } from "react-native";

import { AppButton, AppInput, AppText } from "@/components/design-system";
import { ImageUploadField } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { PortfolioBody, PortfolioDraft } from "@/types/listing";

interface Props {
  initial: PortfolioDraft;
  saving: boolean;
  onSave: (body: PortfolioBody) => void;
}

/** Photo, title and description fields shown inside PortfolioSheet. */

export function PortfolioForm({ initial, saving, onSave }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<PortfolioDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const set = (patch: Partial<PortfolioDraft>): void => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, null])) }));
  };

  const submit = (): void => {
    const title = draft.title.trim();
    const next = {
      imageUrl: draft.imageUrl ? null : "Upload a photo",
      title:
        title.length < 2
          ? "Give the photo a short title"
          : title.length > 100
            ? "Keep the title under 100 characters"
            : null,
      description:
        draft.description.trim().length > 500 ? "Keep the description under 500 characters" : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean) || !draft.imageUrl) return;
    onSave({ title, description: draft.description.trim() || null, imageUrl: draft.imageUrl });
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        gap: theme.spacing[4],
        padding: theme.spacing[4],
        paddingTop: 0,
      }}
    >
      <AppText variant="caption" tone="secondary">
        Show a finished job, your shop or your team. Clear, well-lit photos work best.
      </AppText>
      <ImageUploadField
        label="Photo"
        purpose="portfolio"
        value={draft.imageUrl}
        onChange={(imageUrl) => set({ imageUrl })}
      />
      {errors.imageUrl ? (
        <AppText variant="caption" tone="danger">
          {errors.imageUrl}
        </AppText>
      ) : null}
      <AppInput
        label="Title"
        required
        value={draft.title}
        onChangeText={(title) => set({ title })}
        error={errors.title}
        placeholder="e.g. 55 inch LED panel replacement"
        maxLength={100}
      />
      <AppInput
        label="Description"
        helper="Optional"
        multiline
        value={draft.description}
        onChangeText={(description) => set({ description })}
        error={errors.description}
        maxLength={500}
      />
      <AppButton size="lg" fullWidth loading={saving} onPress={submit}>
        Save photo
      </AppButton>
    </ScrollView>
  );
}
