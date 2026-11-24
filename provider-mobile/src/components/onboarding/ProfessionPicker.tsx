import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Check, Search } from "lucide-react-native";

import { AppChip, AppInput, AppSkeleton, AppText } from "@/components/design-system";
import { ErrorState } from "@/components/layout";
import { useProfessions } from "@/hooks/useListings";
import { useTheme } from "@/hooks/useTheme";
import type { Profession } from "@/types";
import { filterProfessions, professionKey } from "@/utils/accountType";

interface Props {
  value: string;
  /** Professions the account already lists, lower case; they are left out. */
  taken: string[];
  error?: string;
  onPick: (p: Profession) => void;
}

const SHOWN = 30;

/** The professions an individual can list as, searchable: plumber, AC technician, tutor... */
export function ProfessionPicker({ value, taken, error, onPick }: Props) {
  const theme = useTheme();
  const professions = useProfessions();
  const [q, setQ] = useState("");
  const all = (professions.data ?? []).filter(
    (p) => professionKey(p) === value || !taken.includes(p.label.toLowerCase()),
  );
  const matches = filterProfessions(all, q);
  const picked = all.find((p) => professionKey(p) === value);
  // The picked one stays visible whatever the search.
  const shown = [
    ...(picked && !matches.slice(0, SHOWN).includes(picked) ? [picked] : []),
    ...matches.slice(0, SHOWN),
  ];

  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppInput
        label="Your profession"
        required
        value={q}
        onChangeText={setQ}
        placeholder="Search: plumber, electrician, tutor..."
        leadingIcon={<Search size={16} color={theme.colors.text.tertiary} />}
        autoCorrect={false}
        error={error}
      />
      {professions.isLoading ? (
        <View style={[styles.chips, { gap: theme.spacing[2] }]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AppSkeleton key={i} width={120} height={34} shape="block" />
          ))}
        </View>
      ) : professions.isError ? (
        <ErrorState error={professions.error} onRetry={() => void professions.refetch()} />
      ) : (
        <View
          style={[styles.chips, { gap: theme.spacing[2] }]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Professions"
        >
          {shown.map((p) => {
            const selected = professionKey(p) === value;
            return (
              <AppChip
                key={professionKey(p)}
                label={p.label}
                selected={selected}
                leadingIcon={
                  selected ? (
                    <Check size={14} color={theme.colors.background.secondary} />
                  ) : undefined
                }
                onPress={() => onPick(p)}
              />
            );
          })}
        </View>
      )}
      {!professions.isLoading && !professions.isError && matches.length === 0 ? (
        <AppText variant="meta">
          No profession matches. Try another word, or pick the closest one and type your own title
          below.
        </AppText>
      ) : matches.length > SHOWN ? (
        <AppText variant="meta">{`${matches.length - SHOWN} more. Search to narrow the list.`}</AppText>
      ) : null}
      {taken.length ? (
        <AppText variant="meta">Professions you already list are not shown.</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
