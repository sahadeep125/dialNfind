import { useMutation } from "@tanstack/react-query";

import { AppButton, AppCallout } from "@/components/design-system";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";

/** Shown until the account's email address is confirmed. Nothing is blocked; it only asks. */
export function VerifyEmailCallout() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const resend = useMutation({
    mutationFn: (): Promise<unknown> => api("/auth/resend-verification", { method: "POST" }),
    onSuccess: () => toast(`We sent a new link to ${user?.email ?? "your email"}`, "success"),
    onError: (error: Error) => toast(errorMessage(error), "error"),
  });
  if (!user || user.emailVerifiedAt) return null;
  return (
    <AppCallout
      tone="warning"
      title="Confirm your email address"
      action={
        <AppButton
          size="sm"
          variant="secondary"
          loading={resend.isPending}
          disabled={resend.isSuccess}
          onPress={() => resend.mutate()}
        >
          {resend.isSuccess ? "Link sent" : "Send a new link"}
        </AppButton>
      }
    >
      {`We sent a link to ${user.email}. Confirming it lets us reach you about your account.`}
    </AppCallout>
  );
}
