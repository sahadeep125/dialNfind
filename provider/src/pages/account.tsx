import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";
import { normalizePhone, optionalPhone, password, personName } from "@/lib/validation";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Where a store-bought plan is cancelled; deleting the account cannot stop Apple or Google billing. */
const STORE_MANAGE: Record<"app_store" | "play_store", { label: string; url: string }> = {
  app_store: { label: "App Store subscriptions", url: "https://apps.apple.com/account/subscriptions" },
  play_store: { label: "Google Play subscriptions", url: "https://play.google.com/store/account/subscriptions" },
};

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Account settings" description="Your sign-in details. Business details customers see are under Business details." />
      <div className="grid max-w-3xl gap-6">
        <ProfilePanel user={user} />
        <PasswordPanel user={user} />
        <DeletePanel user={user} />
      </div>
    </>
  );
}

const profileSchema = z.object({ name: personName, phone: optionalPhone });
type ProfileValues = z.infer<typeof profileSchema>;

function ProfilePanel({ user }: { user: User }) {
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
    mode: "onTouched",
  });
  const { errors, isDirty, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { user: saved } = await api<{ user: User }>("/auth/me", { method: "PATCH", json: { name: v.name.trim(), phone: v.phone ? normalizePhone(v.phone) : null } });
      reset({ name: saved.name, phone: saved.phone ?? "" });
      await refresh();
      toast.success("Account details saved");
    } catch (err) {
      setError(errorMessage(err));
    }
  });
  return (
    <Panel title="Your details" description="The name and phone number on your DialNFind account.">
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="acc-name" label="Your name" error={errors.name} required>
            <Input autoComplete="name" {...fieldA11y("acc-name", errors.name)} {...register("name")} />
          </Field>
          <Field id="acc-phone" label="Mobile number" error={errors.phone} optional hint="Only our team sees it. Your business number is set under Business details.">
            <Input type="tel" inputMode="tel" autoComplete="tel" {...fieldA11y("acc-phone", errors.phone, true)} {...register("phone")} />
          </Field>
        </div>
        <Field id="acc-email" label="Email" hint="To change your sign-in email, contact support.">
          <Input value={user.email} readOnly disabled {...fieldA11y("acc-email", undefined, true)} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <UserRound />} Save details
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PasswordPanel({ user }: { user: User }) {
  const { refresh } = useAuth();
  const hasPassword = user.hasPassword;
  const schema = z
    .object({ currentPassword: hasPassword ? z.string().min(1, "Enter your current password") : z.string(), newPassword: password, confirm: z.string() })
    .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match" });
  type Values = z.infer<typeof schema>;
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" }, mode: "onTouched" });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api("/auth/change-password", { method: "POST", json: { currentPassword: hasPassword ? v.currentPassword : undefined, newPassword: v.newPassword } });
      reset();
      await refresh();
      toast.success(hasPassword ? "Password changed. Other devices have been signed out." : "Password set. You can now sign in with your email too.");
    } catch (err) {
      setError(errorMessage(err));
    }
  });
  const via = user.linkedAccounts.map((a) => (a === "google" ? "Google" : "Apple")).join(" and ");
  return (
    <Panel
      title={hasPassword ? "Change password" : "Set a password"}
      description={hasPassword ? "Changing it signs you out on your other devices." : `You sign in with ${via || "a linked account"}. Set a password to also sign in with your email.`}
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />
        {hasPassword && (
          <Field id="pw-current" label="Current password" error={errors.currentPassword} required>
            <Input type="password" autoComplete="current-password" {...fieldA11y("pw-current", errors.currentPassword)} {...register("currentPassword")} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pw-new" label="New password" error={errors.newPassword} hint="At least 8 characters with a letter and a number." required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("pw-new", errors.newPassword, true)} {...register("newPassword")} />
          </Field>
          <Field id="pw-confirm" label="Confirm new password" error={errors.confirm} required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("pw-confirm", errors.confirm)} {...register("confirm")} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />} {hasPassword ? "Change password" : "Set password"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function DeletePanel({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Delete account" description="Permanently delete your business account and remove your listing from DialNFind.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Your listing is removed from search straight away.</li>
          <li>Your plan stops renewing and running promotions end.</li>
          <li>Your sign-in details are erased. This cannot be undone.</li>
        </ul>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 /> Delete account
        </Button>
      </div>
      <DeleteDialog user={user} open={open} onClose={() => setOpen(false)} />
    </Panel>
  );
}

function DeleteDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; storeSubscription: "app_store" | "play_store" | null }>("/auth/me", {
        method: "DELETE",
        json: user.hasPassword ? { password: value } : { confirm: value },
      }),
    onSuccess: ({ storeSubscription }) => {
      const store = storeSubscription ? STORE_MANAGE[storeSubscription] : null;
      // The session is already gone on the server; clear it here too.
      signOut();
      navigate("/login", { replace: true });
      if (store) {
        toast.warning("Your account is deleted. Your plan was bought in an app store: cancel it there so you are not charged again.", {
          duration: 20_000,
          action: { label: store.label, onClick: () => window.open(store.url, "_blank", "noopener") },
        });
      } else {
        toast.success("Your account has been deleted.");
      }
    },
    onError: (err) => setProblem(errorMessage(err)),
  });
  const close = () => {
    setValue("");
    setProblem(null);
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" /> Delete your account?
          </DialogTitle>
          <DialogDescription>
            Your listing leaves DialNFind, your plan stops renewing and running promotions end. Leads and reviews are kept only as anonymous records. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          id="delete-account"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (user.hasPassword ? !value : value.trim().toUpperCase() !== "DELETE") {
              return setProblem(user.hasPassword ? "Enter your password" : "Type DELETE to confirm");
            }
            del.mutate();
          }}
        >
          <Field id="delete-confirm" label={user.hasPassword ? "Enter your password to confirm" : "Type DELETE to confirm"} error={problem ?? undefined}>
            <Input
              type={user.hasPassword ? "password" : "text"}
              autoComplete={user.hasPassword ? "current-password" : "off"}
              value={value}
              onChange={(e) => (setValue(e.target.value), setProblem(null))}
              {...fieldA11y("delete-confirm", problem ?? undefined)}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Keep my account
          </Button>
          <Button type="submit" form="delete-account" variant="destructive" disabled={del.isPending}>
            {del.isPending && <Loader2 className="animate-spin" />} Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
