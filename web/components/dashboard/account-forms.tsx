"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Home, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { clientApi, ClientApiError } from "@/lib/client";
import { normalizePhone, optionalPhone, password, personName, pincode } from "@/lib/validation";
import type { Address } from "@/lib/types";

function errorMessage(err: unknown) {
  return err instanceof ClientApiError ? err.message : "Something went wrong";
}

const profileSchema = z.object({
  name: personName,
  phone: optionalPhone,
  profilePhotoUrl: z.string(),
});
type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({ name, email, phone, profilePhotoUrl }: { name: string; email: string; phone: string | null; profilePhotoUrl: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: { name, phone: phone ?? "", profilePhotoUrl: profilePhotoUrl ?? "" },
  });
  const { errors, isSubmitting, isDirty } = formState;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const phoneValue = v.phone ? normalizePhone(v.phone) : null;
      await clientApi("/auth/me", { method: "PATCH", body: JSON.stringify({ name: v.name.trim(), phone: phoneValue, profilePhotoUrl: v.profilePhotoUrl || null }) });
      reset({ ...v, name: v.name.trim(), phone: phoneValue ?? "" });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2">
          <FormAlert message={error} />
        </div>
      )}
      <Field id="avatar" label="Profile photo" hint="Shown next to reviews you write. A clear photo of your face works best." optional className="sm:col-span-2">
        <Controller
          control={control}
          name="profilePhotoUrl"
          render={({ field }) => <FileUpload id="avatar" purpose="avatar" value={field.value} onChange={field.onChange} previewClassName="size-24 rounded-full" describedBy="avatar-hint" onUploadingChange={setUploading} />}
        />
      </Field>
      <Field id="name" label="Full name" error={errors.name} required>
        <Input {...fieldA11y("name", errors.name)} autoComplete="name" maxLength={80} {...register("name")} />
      </Field>
      <Field id="email" label="Email" hint="Contact support to change your email.">
        <Input {...fieldA11y("email", undefined, true)} value={email} disabled readOnly />
      </Field>
      <Field id="phone" label="Phone" error={errors.phone} optional>
        <Input {...fieldA11y("phone", errors.phone)} type="tel" autoComplete="tel" inputMode="tel" maxLength={16} placeholder="98xxx xxxxx" {...register("phone")} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={isSubmitting || uploading || !isDirty}>
          {isSubmitting && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </div>
    </form>
  );
}

// Accounts made with Google or Apple have no password yet; they set one without a "current password".
const passwordSchema = (hasPassword: boolean) =>
  z
    .object({
      currentPassword: hasPassword ? z.string().min(1, "Enter your current password") : z.string(),
      newPassword: password,
      confirmPassword: z.string().min(1, "Re-enter the new password"),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { message: "The passwords do not match", path: ["confirmPassword"] })
    .refine((v) => !hasPassword || v.newPassword !== v.currentPassword, { message: "Choose a password different from your current one", path: ["newPassword"] });
type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const empty: PasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const { register, handleSubmit, reset, formState } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema(hasPassword)), mode: "onTouched", defaultValues: empty });
  const { errors, isSubmitting } = formState;
  const type = show ? "text" : "password";

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await clientApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: hasPassword ? v.currentPassword : undefined, newPassword: v.newPassword }),
      });
      toast.success(hasPassword ? "Password changed" : "Password set. You can now also log in with your email.");
      reset(empty);
      if (!hasPassword) router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2">
          <FormAlert message={error} />
        </div>
      )}
      {hasPassword && (
        <Field id="currentPassword" label="Current password" error={errors.currentPassword} required className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
          <Input {...fieldA11y("currentPassword", errors.currentPassword)} type={type} autoComplete="current-password" {...register("currentPassword")} />
        </Field>
      )}
      <Field id="newPassword" label="New password" error={errors.newPassword} hint="At least 8 characters, with a letter and a number." required>
        <Input {...fieldA11y("newPassword", errors.newPassword, true)} type={type} autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword} required>
        <Input {...fieldA11y("confirmPassword", errors.confirmPassword)} type={type} autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} {hasPassword ? "Change password" : "Set password"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff /> : <Eye />} {show ? "Hide passwords" : "Show passwords"}
        </Button>
      </div>
    </form>
  );
}

const addressSchema = z.object({
  label: z.string().trim().max(30, "Keep the label under 30 characters"),
  addressLine: z.string().trim().min(3, "Enter the house, street and landmark").max(200, "Keep the address under 200 characters"),
  city: z.string().trim().min(2, "Enter your city").max(60, "Keep it under 60 characters"),
  state: z.string().trim().min(2, "Enter your state").max(60, "Keep it under 60 characters"),
  pincode,
});
type AddressValues = z.infer<typeof addressSchema>;
const EMPTY_ADDRESS: AddressValues = { label: "", addressLine: "", city: "", state: "", pincode: "" };

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), mode: "onTouched", defaultValues: EMPTY_ADDRESS });
  const { errors, isSubmitting } = formState;

  const add = handleSubmit(async (v) => {
    setError(null);
    try {
      await clientApi("/me/addresses", {
        method: "POST",
        body: JSON.stringify({ ...v, label: v.label.trim() || "Home", isDefault: addresses.length === 0 }),
      });
      toast.success("Address saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset(EMPTY_ADDRESS);
      setError(null);
    }
  }

  async function makeDefault(id: number) {
    try {
      await clientApi(`/me/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this address?")) return;
    try {
      await clientApi(`/me/addresses/${id}`, { method: "DELETE" });
      toast.success("Address removed");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-xl border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              {a.label.toLowerCase() === "home" ? <Home className="size-4" /> : <MapPin className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {a.label} {a.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.addressLine}, {a.city}, {a.state} {a.pincode}
              </p>
              <div className="mt-2 flex gap-1">
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(a.id)}>
                    <Star /> Make default
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}>
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <button type="button" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary">
              <Plus className="size-5" /> Add address
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add an address</DialogTitle>
              <DialogDescription>Used as a starting point when you search for providers nearby.</DialogDescription>
            </DialogHeader>
            <form onSubmit={add} noValidate className="grid gap-4 sm:grid-cols-2">
              {error && (
                <div className="sm:col-span-2">
                  <FormAlert message={error} />
                </div>
              )}
              <Field id="label" label="Label" error={errors.label} optional>
                <Input {...fieldA11y("label", errors.label)} maxLength={30} placeholder="Home, Work..." {...register("label")} />
              </Field>
              <Field id="pincode" label="PIN code" error={errors.pincode} required>
                <Input
                  {...fieldA11y("pincode", errors.pincode)}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  placeholder="734001"
                  {...register("pincode", { onChange: (e) => (e.target.value = e.target.value.replace(/\D/g, "")) })}
                />
              </Field>
              <Field id="addressLine" label="Address" error={errors.addressLine} required className="sm:col-span-2">
                <Input {...fieldA11y("addressLine", errors.addressLine)} autoComplete="street-address" maxLength={200} placeholder="House, street, landmark" {...register("addressLine")} />
              </Field>
              <Field id="city" label="City" error={errors.city} required>
                <Input {...fieldA11y("city", errors.city)} autoComplete="address-level2" maxLength={60} {...register("city")} />
              </Field>
              <Field id="state" label="State" error={errors.state} required>
                <Input {...fieldA11y("state", errors.state)} autoComplete="address-level1" maxLength={60} {...register("state")} />
              </Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />} Save address
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/** Permanently deletes the account after a password check (accounts made with Google or Apple have none). */
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (hasPassword && !pw) {
      setError("Enter your password to confirm");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clientApi("/auth/me", { method: "DELETE", body: JSON.stringify(hasPassword ? { password: pw } : {}) });
      // The API has already ended the session; this clears the cookie.
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      toast.success("Your account has been deleted");
      window.location.assign("/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPw("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile, reviews, favorites and saved addresses are removed and you are signed out everywhere. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <FormAlert message={error} />}
        {hasPassword && (
          <div className="grid gap-2">
            <label htmlFor="delete-password" className="text-sm font-medium">
              Your password
            </label>
            <Input id="delete-password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
