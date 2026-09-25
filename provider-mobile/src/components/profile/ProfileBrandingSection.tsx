import { ImageUploadField } from "@/components/forms";
import type { ProfileFormValues } from "@/types/listing";
import { FormSection } from "./FormSection";

interface Props {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}

export function ProfileBrandingSection({ values, onChange }: Props) {
  return (
    <FormSection
      title="Branding"
      description="A clear logo and cover photo make your listing stand out in search results."
    >
      <ImageUploadField
        label="Logo"
        helper="Square image, at least 200 x 200 px"
        purpose="logo"
        value={values.logoUrl}
        onChange={(logoUrl) => onChange({ logoUrl })}
      />
      <ImageUploadField
        label="Cover image"
        helper="Wide image, at least 1200 x 400 px"
        purpose="cover"
        value={values.coverUrl}
        onChange={(coverUrl) => onChange({ coverUrl })}
      />
    </FormSection>
  );
}
