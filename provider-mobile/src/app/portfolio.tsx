import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ImagePlus, Images, Lock } from "lucide-react-native";

import { AppButton, AppIconButton, AppSkeleton, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { PortfolioSheet } from "@/components/portfolio/PortfolioSheet";
import { PortfolioTile } from "@/components/portfolio/PortfolioTile";
import { PortfolioArrangeSheet } from "@/components/portfolio/PortfolioArrangeSheet";
import { LockedCard } from "@/components/subscription/LockedCard";
import { ConfirmSheet } from "@/components/profile/ConfirmSheet";
import { MAX_CONTENT_WIDTH } from "@/constants/spacing";
import { useLayout } from "@/hooks/useLayout";
import { useDeletePortfolioItem, useReorderPortfolio, useSavePortfolioItem, useSetCoverPhoto } from "@/hooks/usePortfolio";
import { useProfile } from "@/hooks/useProfile";
import { usePlan } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useUpload } from "@/hooks/useUpload";
import { errorMessage } from "@/services/api";
import type { PortfolioItem } from "@/types";
import type { PortfolioBody, PortfolioDraft } from "@/types/listing";

const WIDE_MAX = 1100;

export default function PortfolioScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { width } = useLayout();
  const profile = useProfile();
  const plan = usePlan();
  const upload = useUpload("portfolio");
  const saveItem = useSavePortfolioItem();
  const deleteItem = useDeletePortfolioItem();
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [removing, setRemoving] = useState<PortfolioItem | null>(null);
  const [arrangingId, setArrangingId] = useState<number | null>(null);
  const reorder = useReorderPortfolio();
  const setCover = useSetCoverPhoto();
  const [refreshing, setRefreshing] = useState(false);

  const columns = width >= 1024 ? 4 : width >= 600 ? 3 : 2;
  const gap = theme.spacing[3];
  const pad = theme.spacing[4];
  const contentWidth = Math.min(width, columns === 4 ? WIDE_MAX : MAX_CONTENT_WIDTH);
  const tileWidth = Math.floor((contentWidth - pad * 2 - gap * (columns - 1)) / columns);
  const items = profile.data?.portfolio ?? [];
  const uploading = upload.progress !== null;

  /** Pick the image first, then ask for a title: the quickest way to add a photo on a phone. */
  const startAdd = async (): Promise<void> => {
    const imageUrl = await upload.choose("library");
    if (imageUrl) setDraft({ imageUrl, title: "", description: "" });
  };

  const onEdit = useCallback(
    (i: PortfolioItem) =>
      setDraft({
        id: i.id,
        imageUrl: i.imageUrl,
        title: i.title,
        description: i.description ?? "",
      }),
    [],
  );
  const onDelete = useCallback((i: PortfolioItem) => setRemoving(i), []);
  const onArrange = useCallback((i: PortfolioItem) => setArrangingId(i.id), []);
  const arranging = items.find((i) => i.id === arrangingId) ?? null;
  const arrangingIndex = arranging ? items.indexOf(arranging) : -1;
  const firstMovable = items[0]?.isCover ? 1 : 0;

  const move = (item: PortfolioItem, by: -1 | 1): void => {
    const ids = items.map((i) => i.id);
    const at = ids.indexOf(item.id);
    [ids[at], ids[at + by]] = [ids[at + by]!, ids[at]!];
    reorder.mutate(ids, { onError: (e: Error) => toast(errorMessage(e), "error") });
  };
  const makeCover = (item: PortfolioItem): void =>
    setCover.mutate(item.id, {
      onSuccess: () => {
        setArrangingId(null);
        toast("Cover photo set", "success");
      },
      onError: (e: Error) => toast(errorMessage(e), "error"),
    });

  const save = (body: PortfolioBody): void => {
    const id = draft?.id;
    saveItem.mutate(
      { id, body },
      {
        onSuccess: () => {
          setDraft(null);
          toast(id ? "Photo updated" : "Photo added", "success");
        },
        onError: (e: Error) => toast(errorMessage(e), "error"),
      },
    );
  };

  const confirmDelete = (): void => {
    if (!removing) return;
    deleteItem.mutate(removing.id, {
      onSuccess: () => {
        setRemoving(null);
        toast("Photo removed", "success");
      },
      onError: (e: Error) => toast(errorMessage(e), "error"),
    });
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await profile.refetch();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: PortfolioItem }) => (
      <PortfolioTile item={item} width={tileWidth} onEdit={onEdit} onDelete={onDelete} onArrange={onArrange} />
    ),
    [tileWidth, onEdit, onDelete, onArrange],
  );

  const photoLimit = plan.limits.photos.limit;
  const full = photoLimit !== null && items.length >= photoLimit;
  const addButton = full ? (
    <AppIconButton
      accessibilityLabel="Upgrade for more photos"
      variant="soft"
      icon={<Lock size={20} color={theme.colors.brand.softText} />}
      onPress={() => router.push({ pathname: "/paywall", params: { feature: "photos" } })}
    />
  ) : uploading ? (
    <View style={styles.spinner}>
      <ActivityIndicator color={theme.colors.brand.primary} />
    </View>
  ) : (
    <AppIconButton
      accessibilityLabel="Add photo"
      variant="soft"
      icon={<ImagePlus size={20} color={theme.colors.brand.softText} />}
      onPress={() => void startAdd()}
    />
  );

  return (
    <Screen edges={["top", "bottom"]} constrained={false}>
      <View style={[styles.fill, { width: contentWidth }]}>
        <ScreenHeader
          title="Photos"
          subtitle={profile.data ? (photoLimit !== null ? `${items.length} of ${photoLimit} on ${plan.plan.name}` : `${items.length} in your portfolio`) : undefined}
          right={profile.data ? addButton : undefined}
        />
        {profile.data ? (
          <FlatList
            key={columns}
            data={items}
            numColumns={columns}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            columnWrapperStyle={columns > 1 ? { gap } : undefined}
            contentContainerStyle={[styles.grow, { padding: pad, gap }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={theme.colors.brand.primary}
              />
            }
            ListHeaderComponent={
              items.length ? (
                <View style={{ gap: theme.spacing[3] }}>
                  <AppText variant="caption" tone="secondary">
                    Show your shop, your team and finished jobs. Profiles with photos get noticeably
                    more calls.
                  </AppText>
                  {full ? <LockedCard feature="photos" compact /> : null}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={Images}
                title="No photos yet"
                text="Add a few photos of recent work so customers can judge the quality before they call."
                action={
                  <AppButton
                    loading={uploading}
                    leadingIcon={
                      <ImagePlus size={18} color={theme.components.button.primary.text} />
                    }
                    onPress={() => void startAdd()}
                  >
                    Add your first photo
                  </AppButton>
                }
              />
            }
          />
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <View style={[styles.skeleton, { gap, padding: pad }]}>
            {Array.from({ length: columns * 2 }, (_, i) => (
              <AppSkeleton key={i} shape="block" width={tileWidth} height={tileWidth} />
            ))}
          </View>
        )}
      </View>

      <PortfolioSheet
        draft={draft}
        saving={saveItem.isPending}
        onSave={save}
        onClose={() => setDraft(null)}
      />
      <ConfirmSheet
        visible={removing !== null}
        title="Delete photo"
        message={
          removing ? `Remove "${removing.title}" from your profile? This cannot be undone.` : ""
        }
        confirmLabel="Delete"
        loading={deleteItem.isPending}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
      <PortfolioArrangeSheet
        item={arranging}
        index={arrangingIndex}
        count={items.length}
        firstMovable={firstMovable}
        busy={reorder.isPending || setCover.isPending}
        onMove={move}
        onCover={makeCover}
        onClose={() => setArrangingId(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { alignSelf: "center", flex: 1 },
  grow: { flexGrow: 1 },
  spinner: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  skeleton: { flexDirection: "row", flexWrap: "wrap" },
});
