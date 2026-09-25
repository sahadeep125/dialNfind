import { StyleSheet, View } from "react-native";
import { Globe, Mail, MessageCircle, Phone } from "lucide-react-native";

import { AppCard, AppDivider, AppInput, AppText } from "@/components/design-system";
import { AppSwitchRow } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { ContactDraft, StepErrors } from "@/types/onboarding";
import { StepTitle } from "./StepTitle";

interface Props {
  value: ContactDraft;
  errors: StepErrors;
  onChange: (patch: Partial<ContactDraft>) => void;
  /** One line describing the listing about to go live. */
  summary: string;
}

/** Step 5: how customers reach the business, and a last look before publishing. */
export function ContactStep({ value, errors, onChange, summary }: Props) {
  const theme = useTheme();
  const icon = theme.colors.text.tertiary;
  return (
    <View style={{ gap: theme.spacing[5] }}>
      <StepTitle
        title="How should customers reach you?"
        subtitle="Your number is shown on your profile so customers can call directly."
      />
      <View style={[styles.grid, { gap: theme.spacing[4] }]}>
        <View style={styles.cell}>
          <AppInput
            label="Business phone"
            required
            value={value.phone}
            onChangeText={(v) => onChange({ phone: v })}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={16}
            placeholder="98xxx xxxxx"
            leadingIcon={<Phone size={18} color={icon} />}
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="WhatsApp number"
            helper="Optional. Leave empty to use your business phone"
            value={value.whatsappNumber}
            onChangeText={(v) => onChange({ whatsappNumber: v })}
            error={errors.whatsappNumber}
            keyboardType="phone-pad"
            maxLength={16}
            placeholder="Same as phone"
            leadingIcon={<MessageCircle size={18} color={icon} />}
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="Business email"
            helper="Optional"
            value={value.email}
            onChangeText={(v) => onChange({ email: v })}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={254}
            leadingIcon={<Mail size={18} color={icon} />}
          />
        </View>
        <View style={styles.cell}>
          <AppInput
            label="Website"
            helper="Optional"
            value={value.website}
            onChangeText={(v) => onChange({ website: v })}
            error={errors.website}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="URL"
            maxLength={500}
            placeholder="https://"
            leadingIcon={<Globe size={18} color={icon} />}
          />
        </View>
      </View>

      <AppCard variant="flat" style={{ gap: theme.spacing[1] }}>
        <AppSwitchRow
          label="Show a Call button"
          value={value.acceptsCalls}
          onValueChange={(acceptsCalls) => onChange({ acceptsCalls })}
        />
        <AppDivider />
        <AppSwitchRow
          label="Show a WhatsApp button"
          value={value.acceptsWhatsapp}
          onValueChange={(acceptsWhatsapp) => onChange({ acceptsWhatsapp })}
        />
        {errors.acceptsCalls ? (
          <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {errors.acceptsCalls}
          </AppText>
        ) : null}
      </AppCard>

      <AppCard variant="tinted" style={{ gap: theme.spacing[1] }}>
        <AppText variant="label" style={{ color: theme.colors.brand.softText }}>
          Ready to go live
        </AppText>
        <AppText variant="caption" tone="secondary">
          {summary}
        </AppText>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flexBasis: 220, flexGrow: 1 },
});
