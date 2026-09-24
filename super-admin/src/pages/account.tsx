import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { normalizePhone, optionalPhone, password, personName } from "@/lib/validation";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Me {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
}

const profileSchema = z.object({ name: personName, phone: optionalPhone, profilePhotoUrl: z.string() });
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirm: z.string().min(1, "Type the new password again"),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password different from the current one" });
type PasswordValues = z.infer<typeof passwordSchema>;

export function AccountPage() {
  const { data } = useQuery({ queryKey: ["auth-me"], queryFn: () => api<{ user: Me }>("/auth/me") });
  const { user } = useAuth();
  if (!data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="My account" description={`Signed in as ${data.user.email}${user?.adminRole ? `, ${user.adminRole.name}` : user?.role === "super_admin" ? ", super admin" : ""}.`} />
      <div className="grid max-w-4xl gap-6">
        <ProfileForm me={data.user} />
        <PasswordForm />
      </div>
    </>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: me.name, phone: me.phone ?? "", profilePhotoUrl: me.profilePhotoUrl ?? "" },
    mode: "onTouched",
  });
  const { errors, isDirty } = formState;
  const save = useMutation({
    mutationFn: (v: ProfileValues) => api<{ user: Me }>("/auth/me", { method: "PATCH", json: { name: v.name.trim(), phone: v.phone ? normalizePhone(v.phone) : null, profilePhotoUrl: v.profilePhotoUrl || null } }),
    onSuccess: ({ user }) => {
      toast.success("Profile saved");
      reset({ name: user.name, phone: user.phone ?? "", profilePhotoUrl: user.profilePhotoUrl ?? "" });
      void qc.invalidateQueries({ queryKey: ["auth-me"] });
      void qc.invalidateQueries({ queryKey: ["admin", "me"] });
    },
    onError: (e) => setServerError(errorMessage(e)),
  });

  return (
    <Panel title="Profile" description="Your name is shown in the audit log and on internal ticket notes. Customers only ever see DialNFind Support.">
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => (setServerError(null), save.mutate(v)))}>
        <FormAlert message={serverError} />
        <Field id="avatar" label="Photo" optional>
          <Controller
            control={control}
            name="profilePhotoUrl"
            render={({ field }) => <FileUpload id="avatar" purpose="avatar" value={field.value} onChange={(v) => field.onChange(v)} previewClassName="size-20 rounded-full" onUploadingChange={setUploading} />}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name" error={errors.name} required>
            <Input autoComplete="name" {...fieldA11y("name", errors.name)} {...register("name")} />
          </Field>
          <Field id="phone" label="Mobile number" error={errors.phone} optional>
            <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...fieldA11y("phone", errors.phone)} {...register("phone")} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || save.isPending || uploading}>
            {save.isPending && <Loader2 className="animate-spin" />} Save profile
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" }, mode: "onTouched" });
  const { errors } = formState;
  const save = useMutation({
    mutationFn: (v: PasswordValues) => api("/auth/change-password", { method: "POST", json: { currentPassword: v.currentPassword, newPassword: v.newPassword } }),
    onSuccess: () => {
      toast.success("Password changed");
      reset();
    },
    onError: (e) => setServerError(errorMessage(e)),
  });
  return (
    <Panel title="Password" description="If someone gave you a temporary password, replace it here.">
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => (setServerError(null), save.mutate(v)))}>
        <FormAlert message={serverError} />
        <Field id="currentPassword" label="Current password" error={errors.currentPassword} required>
          <Input type="password" autoComplete="current-password" {...fieldA11y("currentPassword", errors.currentPassword)} {...register("currentPassword")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="newPassword" label="New password" error={errors.newPassword} hint="At least 8 characters with a letter and a number" required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("newPassword", errors.newPassword, true)} {...register("newPassword")} />
          </Field>
          <Field id="confirm" label="Confirm new password" error={errors.confirm} required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("confirm", errors.confirm)} {...register("confirm")} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Change password
          </Button>
        </div>
      </form>
    </Panel>
  );
}
