import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react-native";

import { AppButton, AppCallout } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { ConfirmSheet } from "@/components/profile/ConfirmSheet";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { ServiceDetailsCard } from "@/components/services/ServiceDetailsCard";
import { ServiceRow } from "@/components/services/ServiceRow";
import { ServiceSheet } from "@/components/services/ServiceSheet";
import { serviceKey, serviceName } from "@/components/services/serviceRules";
import { listingKeys } from "@/hooks/listingKeys";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";
import { toServiceInput, useSaveServices } from "@/hooks/useServices";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { ProviderService } from "@/types";
import type { ServiceDraft, ServiceInput } from "@/types/listing";

const MAX_SERVICES = 30;

const EMPTY_DRAFT: ServiceDraft = {
  categoryId: null,
  subcategoryId: null,
  price: "",
  priceUnit: "per_visit",
  isPrimary: false,
};

export default function ServicesScreen() {
  const theme = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const profile = useProfile();
  const categories = useCategories();
  const save = useSaveServices();
  const [editing, setEditing] = useState<ProviderService | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ServiceDraft>(EMPTY_DRAFT);
  const [removing, setRemoving] = useState<ProviderService | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const services = useMemo(() => profile.data?.services ?? [], [profile.data]);
  const takenKeys = useMemo(() => new Set(services.map(serviceKey)), [services]);

  const persist = (next: ServiceInput[], message: string, done: () => void): void => {
    save.mutate(next, {
      onSuccess: () => {
        done();
        toast(message, "success");
      },
      onError: (error: Error) => toast(errorMessage(error), "error"),
    });
  };

  const openAdd = (): void => {
    if (services.length >= MAX_SERVICES) {
      toast(`You can list up to ${MAX_SERVICES} services`, "error");
      return;
    }
    setDraft({ ...EMPTY_DRAFT, isPrimary: services.length === 0 });
    setAdding(true);
  };

  const onEdit = useCallback((s: ProviderService) => {
    setDraft({
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId,
      price: s.startingPrice === null ? "" : String(s.startingPrice),
      priceUnit: s.priceUnit,
      isPrimary: s.isPrimary,
    });
    setEditing(s);
  }, []);
  const onDelete = useCallback((s: ProviderService) => setRemoving(s), []);

  const submitDraft = (d: ServiceDraft): void => {
    const price = d.price.trim() ? Number(d.price) : null;
    const target = editing ? serviceKey(editing) : serviceKey(d);
    let next = services.map(toServiceInput);
    if (editing) {
      next = next.map((s) =>
        serviceKey(s) === target
          ? { ...s, startingPrice: price, priceUnit: d.priceUnit, isPrimary: d.isPrimary }
          : s,
      );
    } else if (d.categoryId) {
      next.push({
        categoryId: d.categoryId,
        subcategoryId: d.subcategoryId,
        startingPrice: price,
        priceUnit: d.priceUnit,
        isPrimary: d.isPrimary,
      });
    }
    // Only one main service: turning it on here turns it off everywhere else.
    if (d.isPrimary) next = next.map((s) => ({ ...s, isPrimary: serviceKey(s) === target }));
    persist(next, editing ? "Service updated" : "Service added", () => {
      setEditing(null);
      setAdding(false);
    });
  };

  const confirmRemove = (): void => {
    if (!removing) return;
    const key = serviceKey(removing);
    const next = services.map(toServiceInput).filter((s) => serviceKey(s) !== key);
    persist(next, "Service removed", () => setRemoving(null));
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      profile.refetch(),
      qc.invalidateQueries({ queryKey: listingKeys.attributes }),
    ]);
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: ProviderService }) => (
      <ServiceRow
        service={item}
        canDelete={services.length > 1}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    [services.length, onEdit, onDelete],
  );

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="Services and prices"
        subtitle={profile.data ? `${services.length} listed` : undefined}
      />
      {profile.data ? (
        <FlatList
          data={services}
          keyExtractor={(s) => serviceKey(s)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.colors.brand.primary}
            />
          }
          ListHeaderComponent={
            <AppCallout>
              Customers search by service. A starting price makes you far more likely to get the
              call. Tap a service to change its price.
            </AppCallout>
          }
          ListEmptyComponent={
            <EmptyState
              icon={Wrench}
              title="No services yet"
              text="Add the services you offer so customers can find you."
            />
          }
          ListFooterComponent={
            <View style={{ gap: theme.spacing[4], marginTop: theme.spacing[1] }}>
              <AppButton
                variant="soft"
                fullWidth
                leadingIcon={<Plus size={18} color={theme.colors.brand.softText} />}
                onPress={openAdd}
                disabled={categories.isLoading}
              >
                Add a service
              </AppButton>
              <ServiceDetailsCard />
            </View>
          }
        />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileSkeleton cards={2} />
      )}

      <ServiceSheet
        visible={adding || editing !== null}
        editingName={editing ? serviceName(editing) : null}
        draft={draft}
        categories={categories.data ?? []}
        takenKeys={takenKeys}
        saving={save.isPending}
        onSave={submitDraft}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <ConfirmSheet
        visible={removing !== null}
        title="Remove service"
        message={
          removing
            ? `Remove ${serviceName(removing)} from your profile? Customers searching for it will no longer find you.`
            : ""
        }
        confirmLabel="Remove"
        loading={save.isPending}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </Screen>
  );
}
