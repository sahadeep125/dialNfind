import { View } from "react-native";
import { Globe, Mail, MessageCircle, Phone } from "lucide-react-native";

import { AppDivider, AppInput, AppText } from "@/components/design-system";
import { AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ProfileFormErrors, ProfileFormValues } from "@/types/listing";
import { FormSection } from "./FormSection";

interface Props {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}

export function ProfileContactSection({ values, errors, onChange }: Props) {
  const theme = useTheme();
  const iconColor = theme.colors.text.tertiary;
  return (
    <FormSection
      title="Contact"
      description="Customers reach you directly. DialNFind never charges per lead."
    >
      <AppInput
        label="Business phone"
        required
        value={values.phone}
        onChangeText={(phone) => onChange({ phone })}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        leadingIcon={<Phone size={18} color={iconColor} />}
      />
      <AppInput
        label="WhatsApp number"
        helper="Optional. Leave empty to use your business phone."
        value={values.whatsappNumber}
        onChangeText={(whatsappNumber) => onChange({ whatsappNumber })}
        error={errors.whatsappNumber}
        keyboardType="phone-pad"
        leadingIcon={<MessageCircle size={18} color={iconColor} />}
      />
      <AppInput
        label="Email"
        helper="Optional"
        value={values.email}
        onChangeText={(email) => onChange({ email })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        leadingIcon={<Mail size={18} color={iconColor} />}
      />
      <AppInput
        label="Website"
        helper="Optional"
        value={values.website}
        onChangeText={(website) => onChange({ website })}
        error={errors.website}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://"
        leadingIcon={<Globe size={18} color={iconColor} />}
      />
      <View>
        <AppSwitchRow
          label="Show a Call button"
          value={values.acceptsCalls}
          onValueChange={(acceptsCalls) => onChange({ acceptsCalls })}
        />
        <AppDivider />
        <AppSwitchRow
          label="Show a WhatsApp button"
          value={values.acceptsWhatsapp}
          onValueChange={(acceptsWhatsapp) => onChange({ acceptsWhatsapp })}
        />
        {errors.acceptsCalls ? (
          <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {errors.acceptsCalls}
          </AppText>
        ) : null}
      </View>
    </FormSection>
  );
}
