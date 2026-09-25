import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Search } from "lucide-react-native";

import { AppButton, AppInput } from "@/components/design-system";
import { AppSelect } from "@/components/forms";
import { useTheme } from "@/hooks/useTheme";
import type { SelectOption } from "@/types";

const CITY_OPTIONS: SelectOption<string>[] = [
  "Siliguri",
  "Kolkata",
  "Bengaluru",
  "Delhi",
  "Mumbai",
].map((c) => ({ value: c, label: c }));

interface Props {
  initialQuery: string;
  initialCity: string;
  loading: boolean;
  onSearch: (q: string, city: string) => void;
}

/** Business name or phone plus a city, submitted together like the web claim page. */
export function ClaimSearchForm({ initialQuery, initialCity, loading, onSearch }: Props) {
  const theme = useTheme();
  const [q, setQ] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    if (q.trim().length < 2) {
      setError("Enter at least 2 characters of the business name or phone");
      return;
    }
    setError(null);
    onSearch(q.trim(), city);
  };

  return (
    <View style={[styles.form, { gap: theme.spacing[3] }]}>
      <AppInput
        label="Business name or phone number"
        value={q}
        onChangeText={(v) => {
          setQ(v);
          if (error) setError(null);
        }}
        error={error}
        maxLength={100}
        placeholder="e.g. Sharma TV Care"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={submit}
        leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
      />
      <AppSelect label="City" options={CITY_OPTIONS} value={city} onChange={setCity} />
      <AppButton
        fullWidth
        loading={loading}
        onPress={submit}
        leadingIcon={<Search size={18} color={theme.components.button.primary.text} />}
      >
        Search
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%" },
});
