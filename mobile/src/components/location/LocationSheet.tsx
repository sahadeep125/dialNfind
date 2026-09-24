import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Crosshair, MapPin, Search } from "lucide-react-native";

import { AppButton, AppInput, AppListItem, AppSheet, AppText } from "@/components/design-system";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocations } from "@/hooks/useLocations";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { getCurrentLocation } from "@/services/location";
import { useLocationStore } from "@/stores/useLocationStore";
import type { LocationOption } from "@/types";
import { plural } from "@/utils/format";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Pick the area to search around: the device location, or a city or locality from the directory. */
export function LocationSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const setLocation = useLocationStore((s) => s.setLocation);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const term = useDebounce(query, 250);
  const { data, isLoading } = useLocations(term);

  const choose = (location: LocationOption): void => {
    setLocation(location);
    setQuery("");
    onClose();
  };

  const locateMe = async (): Promise<void> => {
    setLocating(true);
    try {
      choose(await getCurrentLocation());
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setLocating(false);
    }
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title="Choose your area">
      <View style={styles.body}>
        <AppInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city or locality"
          autoCorrect={false}
          returnKeyType="search"
          leadingIcon={<Search size={18} color={theme.colors.text.tertiary} />}
        />
        <AppButton
          variant="soft"
          loading={locating}
          onPress={() => void locateMe()}
          leadingIcon={<Crosshair size={18} color={theme.colors.brand.softText} />}
        >
          Use my current location
        </AppButton>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.brand.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => `${item.kind}-${item.label}`}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={
              <AppText tone="secondary" align="center" style={styles.empty}>
                No areas match that search yet.
              </AppText>
            }
            renderItem={({ item }) => (
              <AppListItem
                title={item.label}
                subtitle={[
                  item.kind === "city" ? "City" : "Area",
                  item.providerCount ? plural(item.providerCount, "provider") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                leading={<MapPin size={18} color={theme.colors.text.secondary} />}
                onPress={() => choose(item)}
                showChevron={false}
              />
            )}
          />
        )}
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  list: { maxHeight: 360 },
  loader: { paddingVertical: 24 },
  empty: { paddingVertical: 24 },
});
