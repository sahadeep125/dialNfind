import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, SearchX } from "lucide-react-native";

import { ClaimConfirm } from "@/components/claim/ClaimConfirm";
import { ClaimOtpForm } from "@/components/claim/ClaimOtpForm";
import { ClaimSearchForm } from "@/components/claim/ClaimSearchForm";
import { ListingRow } from "@/components/claim/ListingRow";
import { AppButton, AppSkeleton, AppText } from "@/components/design-system";
import { EmptyState, ErrorState, Screen, ScreenHeader } from "@/components/layout";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useClaimListing, useClaimSearch, useStartClaim, useVerifyClaim } from "@/hooks/useClaims";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/services/api";
import type { ClaimListing, ClaimMethod } from "@/types/onboarding";

type Step =
  | { kind: "search" }
  | { kind: "confirm"; listing: ClaimListing }
  | { kind: "otp"; listing: ClaimListing; claimId: number; sentTo: string; devCode?: string }
  | { kind: "document-sent"; listing: ClaimListing };

/** Find an existing listing and prove it is yours by SMS code or by uploading a document. */
export default function ClaimScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { applyToken } = useAuthActions();
  const params = useLocalSearchParams<{ listing?: string }>();
  const linkedId = params.listing && /^\d+$/.test(params.listing) ? Number(params.listing) : null;

  // Null until the person acts, so a claim link from the website opens straight on that listing.
  const [chosen, setStep] = useState<Step | null>(null);
  const [search, setSearch] = useState({ q: "", city: "Siliguri" });
  const results = useClaimSearch(search.q, search.city);
  const linked = useClaimListing(linkedId);
  const startClaim = useStartClaim();
  const verifyClaim = useVerifyClaim();
  const [startingWith, setStartingWith] = useState<ClaimMethod | null>(null);
  const step: Step =
    chosen ?? (linked.data ? { kind: "confirm", listing: linked.data } : { kind: "search" });

  useEffect(() => {
    if (linked.isError) toast("We could not find that listing", "error");
  }, [linked.isError, toast]);

  const start = (listing: ClaimListing, method: ClaimMethod, documentUrl?: string): void => {
    setStartingWith(method);
    startClaim.mutate(
      { providerId: listing.id, method, documentUrl },
      {
        onSuccess: async (res) => {
          // A customer account becomes a provider here, so it gets a new token.
          if (res.token) await applyToken(res.token);
          if (method === "phone_otp")
            setStep({
              kind: "otp",
              listing,
              claimId: res.claim.id,
              sentTo: res.sentTo ?? listing.phone,
              devCode: res.devCode,
            });
          else setStep({ kind: "document-sent", listing });
        },
        onError: (error: Error) => toast(errorMessage(error), "error"),
        onSettled: () => setStartingWith(null),
      },
    );
  };

  const verify = (code: string): void => {
    if (step.kind !== "otp") return;
    verifyClaim.mutate(
      { claimId: step.claimId, code },
      {
        onSuccess: async () => {
          await applyToken(null);
          toast(`${step.listing.businessName} is now yours`, "success");
          router.replace("/");
        },
        onError: (error: Error) => toast(errorMessage(error), "error"),
      },
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: ClaimListing }) => (
      <ListingRow
        listing={item}
        action={
          item.isClaimed ? (
            <AppText variant="caption" tone="tertiary">
              Claimed
            </AppText>
          ) : (
            <AppButton size="sm" onPress={() => setStep({ kind: "confirm", listing: item })}>
              Select
            </AppButton>
          )
        }
      />
    ),
    [],
  );

  const searched = search.q.length >= 2;

  const listEmpty = !searched ? null : results.isLoading ? (
    <View style={{ gap: theme.spacing[2] }}>
      {[0, 1, 2].map((i) => (
        <AppSkeleton key={i} height={72} shape="block" />
      ))}
    </View>
  ) : results.isError ? (
    <ErrorState error={results.error} onRetry={() => void results.refetch()} />
  ) : (
    <EmptyState
      icon={SearchX}
      title="No match found"
      text="Check the spelling or try the phone number on the listing. You can also create a new listing."
      action={
        <AppButton variant="secondary" onPress={() => router.replace("/onboarding")}>
          Create a new listing
        </AppButton>
      }
    />
  );

  const intro = (
    <View style={{ gap: theme.spacing[1] }}>
      <AppText variant="title" accessibilityRole="header">
        Claim your business
      </AppText>
      <AppText tone="secondary">
        Find your listing, then prove it is yours. Your reviews and history stay with it.
      </AppText>
    </View>
  );

  if (step.kind === "search") {
    return (
      <Screen edges={["top", "bottom"]}>
        <ScreenHeader title="Claim a listing" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <FlatList
            data={searched ? (results.data ?? []) : []}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[2] }}
            ListHeaderComponent={
              <View style={{ gap: theme.spacing[5], marginBottom: theme.spacing[3] }}>
                {intro}
                {linkedId !== null && linked.isLoading ? (
                  <AppSkeleton height={72} shape="block" />
                ) : null}
                <ClaimSearchForm
                  initialQuery={search.q}
                  initialCity={search.city}
                  loading={results.isFetching}
                  onSearch={(q, city) => setSearch({ q, city })}
                />
              </View>
            }
            ListEmptyComponent={listEmpty}
            refreshControl={
              searched ? (
                <RefreshControl
                  refreshing={results.isRefetching}
                  onRefresh={() => void results.refetch()}
                  tintColor={theme.colors.brand.primary}
                />
              ) : undefined
            }
          />
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Claim a listing" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[5] }}
        >
          {intro}
          {step.kind === "confirm" ? (
            <ClaimConfirm
              listing={step.listing}
              busy={startingWith}
              onStart={(method, documentUrl) => start(step.listing, method, documentUrl)}
              onChooseAnother={() => setStep({ kind: "search" })}
            />
          ) : null}
          {step.kind === "otp" ? (
            <ClaimOtpForm
              listing={step.listing}
              sentTo={step.sentTo}
              devCode={step.devCode}
              loading={verifyClaim.isPending}
              onVerify={verify}
            />
          ) : null}
          {step.kind === "document-sent" ? (
            <EmptyState
              icon={CheckCircle2}
              title="Claim submitted"
              text={`We will review your document for ${step.listing.businessName} and email you once it is approved.`}
              action={
                <AppButton variant="secondary" onPress={() => router.replace("/")}>
                  Done
                </AppButton>
              }
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
