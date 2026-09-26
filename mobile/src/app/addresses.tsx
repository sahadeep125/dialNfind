import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { Redirect } from "expo-router";
import { MapPin, MapPinOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react-native";

import { AppBadge, AppButton, AppCard, AppSheet, AppSkeleton, AppText } from "@/components/design-system";
import { AddressSheet } from "@/components/addresses/AddressSheet";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { useAddresses, useDeleteAddress, useMakeDefaultAddress } from "@/hooks/useAddresses";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";
import type { Address } from "@/types";
import { addressToLocation } from "@/utils/addresses";

/** Saved addresses: search around one in a tap, or pick one from the location sheet. */
export default function AddressesScreen() {
  const theme = useTheme();
  const toast = useToast();
  const signedIn = useAuthStore((s) => !!s.token);
  const setLocation = useLocationStore((s) => s.setLocation);
  const { data, isLoading, isError, error, refetch } = useAddresses();
  const makeDefault = useMakeDefaultAddress();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<Address | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const icon = theme.colors.text.primary;

  const open = (address: Address | null): void => {
    setEditing(address);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const renderItem = useCallback(
    ({ item: a }: ListRenderItemInfo<Address>) => {
      const location = addressToLocation(a);
      return (
        <AppCard padding={theme.spacing[4]}>
          <View style={[styles.head, { gap: theme.spacing[2] }]}>
            <MapPin size={18} color={theme.colors.brand.primary} />
            <AppText variant="subheading" style={styles.flex} numberOfLines={1}>
              {a.label}
            </AppText>
            {a.isDefault ? <AppBadge label="Default" tone="brand" /> : null}
          </View>
          <AppText tone="secondary" style={{ marginTop: theme.spacing[1] }}>
            {a.addressLine}, {a.city}, {a.state} {a.pincode}
          </AppText>
          {!location ? (
            <View style={[styles.head, { gap: theme.spacing[1], marginTop: theme.spacing[2] }]}>
              <MapPinOff size={14} color={theme.colors.text.tertiary} />
              <AppText variant="caption" tone="tertiary">
                No map position yet. Edit it and use your location to search around it.
              </AppText>
            </View>
          ) : null}
          <View style={[styles.actions, { gap: theme.spacing[2], marginTop: theme.spacing[3] }]}>
            {location ? (
              <AppButton
                size="sm"
                leadingIcon={<Search size={14} color="#FFFFFF" />}
                onPress={() => {
                  setLocation(location);
                  toast(`Searching around ${a.label}`, "success");
                }}
              >
                Search here
              </AppButton>
            ) : null}
            <AppButton size="sm" variant="secondary" accessibilityLabel={`Edit ${a.label}`} leadingIcon={<Pencil size={14} color={icon} />} onPress={() => open(a)}>
              Edit
            </AppButton>
            {!a.isDefault ? (
              <AppButton
                size="sm"
                variant="ghost"
                accessibilityLabel={`Make ${a.label} the default`}
                leadingIcon={<Star size={14} color={icon} />}
                onPress={() => makeDefault.mutate(a.id, { onError: (e: Error) => toast(errorMessage(e), "error") })}
              >
                Default
              </AppButton>
            ) : null}
            <AppButton size="sm" variant="ghost" accessibilityLabel={`Delete ${a.label}`} leadingIcon={<Trash2 size={14} color={theme.colors.semantic.danger} />} onPress={() => setDeleting(a)}>
              Delete
            </AppButton>
          </View>
        </AppCard>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutations are stable enough for list rows
    [theme, icon, setLocation, toast],
  );

  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Saved addresses"
        right={
          <AppButton size="sm" variant="ghost" leadingIcon={<Plus size={16} color={theme.colors.brand.primary} />} onPress={() => open(null)}>
            Add
          </AppButton>
        }
      />
      <FlatList
        data={isLoading || isError ? [] : (data ?? [])}
        keyExtractor={(a) => String(a.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { padding: theme.spacing[4], gap: theme.spacing[3] }]}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[3] }}>
              <AppSkeleton shape="block" height={130} />
              <AppSkeleton shape="block" height={130} />
            </View>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No saved addresses"
              text="Save home, work or family addresses to search around them in one tap."
              action={<AppButton onPress={() => open(null)}>Add an address</AppButton>}
            />
          )
        }
      />
      <AddressSheet key={formKey} visible={formOpen} address={editing} onClose={() => setFormOpen(false)} />
      <AppSheet visible={!!deleting} onClose={() => setDeleting(null)} title="Delete this address?">
        <View style={{ gap: theme.spacing[4], paddingBottom: theme.spacing[4] }}>
          <AppText tone="secondary">{deleting ? `${deleting.label}, ${deleting.addressLine}` : ""}</AppText>
          <AppButton
            variant="destructive"
            fullWidth
            loading={remove.isPending}
            onPress={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast("Address deleted", "success");
                  setDeleting(null);
                },
                onError: (e: Error) => toast(errorMessage(e), "error"),
              })
            }
          >
            Delete address
          </AppButton>
        </View>
      </AppSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32 },
  head: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap" },
});
