import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import type { ProviderProfile } from "@/lib/types";
import { normalizePhone, optionalEmail, optionalInt, optionalPhone, optionalUrl, orNull, phone } from "@/lib/validation";
import { useProfile } from "@/layouts/app-layout";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { Field, fieldA11y } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { LocationFields, locationSchema, type LocationErrors } from "@/components/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const profileSchema = z
  .object({
    businessName: z.string().trim().min(2, "Enter your business name").max(100, "Keep it under 100 characters"),
    businessType: z.enum(["individual", "company"]),
    description: z.string().trim().max(2000, "Keep the description under 2000 characters"),
    yearsExperience: optionalInt(0, 80, "Years in business"),
    selfReportedCompletedJobs: optionalInt(0, 1_000_000, "Jobs completed"),
    phone,
    whatsappNumber: optionalPhone,
    email: optionalEmail,
    website: optionalUrl,
    logoUrl: z.string(),
    coverUrl: z.string(),
    acceptsCalls: z.boolean(),
    acceptsWhatsapp: z.boolean(),
    location: locationSchema,
  })
  .refine((v) => v.acceptsCalls || v.acceptsWhatsapp, { path: ["acceptsCalls"], message: "Keep at least one way for customers to reach you" });

type ProfileValues = z.infer<typeof profileSchema>;

function toValues(p: ProviderProfile): ProfileValues {
  return {
    businessName: p.businessName,
    businessType: p.businessType,
    description: p.description ?? "",
    yearsExperience: p.yearsExperience?.toString() ?? "",
    selfReportedCompletedJobs: p.selfReportedCompletedJobs?.toString() ?? "",
    phone: p.phone,
    whatsappNumber: p.whatsappNumber ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
    logoUrl: p.logoUrl ?? "",
    coverUrl: p.coverUrl ?? "",
    acceptsCalls: p.acceptsCalls,
    acceptsWhatsapp: p.acceptsWhatsapp,
    location: {
      addressLine: p.addressLine ?? "",
      locality: p.locality ?? "",
      city: p.city,
      state: p.state,
      pincode: p.pincode ?? "",
      latitude: p.latitude,
      longitude: p.longitude,
      serviceRadiusKm: p.serviceRadiusKm,
    },
  };
}

const CHECKLIST_LINKS: Record<string, string> = {
  services: "/services",
  hours: "/hours",
  areas: "/areas",
  portfolio: "/portfolio",
  verification: "/verification",
};

function locationErrors(errors: FieldErrors<ProfileValues>): LocationErrors | null {
  const loc = errors.location;
  if (!loc) return null;
  const out: LocationErrors = {};
  for (const key of Object.keys(loc) as (keyof LocationErrors)[]) {
    const message = (loc as Record<string, { message?: string } | undefined>)[key]?.message;
    if (message) out[key] = message;
  }
  return out;
}

export function ProfilePage() {
  const { data: profile } = useProfile();
  if (!profile) return <PageSkeleton />;
  return <ProfileEditor profile={profile} />;
}

function ProfileEditor({ profile }: { profile: ProviderProfile }) {
  const qc = useQueryClient();
  const initial = useMemo(() => toValues(profile), [profile]);
  const [uploading, setUploading] = useState(0);
  // defaultValues on first render, then reset whenever the saved profile changes.
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), mode: "onTouched", defaultValues: initial });
  const { register, control, handleSubmit, reset, watch, formState } = form;
  const { errors, isDirty, isSubmitting } = formState;

  useEffect(() => {
    reset(initial);
  }, [initial, reset]);
  const description = watch("description") ?? "";

  const save = handleSubmit(
    async (v) => {
      try {
        const { location } = v;
        await api("/provider/profile", {
          method: "PATCH",
          json: {
            businessName: v.businessName.trim(),
            businessType: v.businessType,
            description: orNull(v.description),
            yearsExperience: v.yearsExperience ? Number(v.yearsExperience) : null,
            selfReportedCompletedJobs: v.selfReportedCompletedJobs ? Number(v.selfReportedCompletedJobs) : null,
            phone: normalizePhone(v.phone),
            whatsappNumber: v.whatsappNumber ? normalizePhone(v.whatsappNumber) : null,
            email: v.email.trim(),
            website: v.website.trim(),
            logoUrl: v.logoUrl,
            coverUrl: v.coverUrl,
            acceptsCalls: v.acceptsCalls,
            acceptsWhatsapp: v.acceptsWhatsapp,
            addressLine: orNull(location.addressLine),
            locality: orNull(location.locality),
            city: location.city.trim(),
            state: location.state.trim(),
            pincode: orNull(location.pincode),
            latitude: location.latitude,
            longitude: location.longitude,
            serviceRadiusKm: location.serviceRadiusKm,
          },
        });
        await qc.invalidateQueries();
        toast.success("Profile updated");
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    () => toast.error("Please fix the highlighted fields"),
  );

  const trackUpload = (busy: boolean) => setUploading((n) => n + (busy ? 1 : -1));

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="Business details"
        description="What customers see on your public profile."
        actions={
          <Button variant="outline" asChild>
            <a href={`${WEB_URL}/providers/${profile.slug}`} target="_blank" rel="noreferrer">
              View public profile <ExternalLink />
            </a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="About your business">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="businessName" label="Business name" error={errors.businessName} required className="sm:col-span-2">
                <Input {...fieldA11y("businessName", errors.businessName)} {...register("businessName")} />
              </Field>
              <Field id="businessType" label="Business type" error={errors.businessType}>
                <Controller
                  control={control}
                  name="businessType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="businessType" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual professional</SelectItem>
                        <SelectItem value="company">Company or shop</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field id="years" label="Years in business" error={errors.yearsExperience}>
                  <Input inputMode="numeric" {...fieldA11y("years", errors.yearsExperience)} {...register("yearsExperience")} />
                </Field>
                <Field id="jobs" label="Jobs completed" error={errors.selfReportedCompletedJobs}>
                  <Input inputMode="numeric" {...fieldA11y("jobs", errors.selfReportedCompletedJobs)} {...register("selfReportedCompletedJobs")} />
                </Field>
              </div>
              <Field
                id="description"
                label="Description"
                error={errors.description}
                optional
                className="sm:col-span-2"
                hint={`${description.length} / 2000 characters. 80 or more helps you rank higher.`}
              >
                <Textarea rows={6} {...fieldA11y("description", errors.description, true)} {...register("description")} />
              </Field>
            </div>
          </Panel>

          <Panel title="Contact" description="Customers reach you directly. DialNFind never charges per lead.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Business phone" error={errors.phone} required>
                <Input type="tel" inputMode="tel" autoComplete="tel" {...fieldA11y("phone", errors.phone)} {...register("phone")} />
              </Field>
              <Field id="whatsapp" label="WhatsApp number" error={errors.whatsappNumber} optional hint="Leave empty to use your business phone">
                <Input type="tel" inputMode="tel" {...fieldA11y("whatsapp", errors.whatsappNumber, true)} {...register("whatsappNumber")} />
              </Field>
              <Field id="email" label="Email" error={errors.email} optional>
                <Input type="email" inputMode="email" autoComplete="email" {...fieldA11y("email", errors.email)} {...register("email")} />
              </Field>
              <Field id="website" label="Website" error={errors.website} optional>
                <Input type="url" inputMode="url" placeholder="https://" {...fieldA11y("website", errors.website)} {...register("website")} />
              </Field>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Controller
                control={control}
                name="acceptsCalls"
                render={({ field }) => (
                  <label className="flex items-center justify-between rounded-xl border p-4">
                    <span className="text-sm font-medium">Show a Call button</span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-describedby={errors.acceptsCalls ? "channels-error" : undefined} />
                  </label>
                )}
              />
              <Controller
                control={control}
                name="acceptsWhatsapp"
                render={({ field }) => (
                  <label className="flex items-center justify-between rounded-xl border p-4">
                    <span className="text-sm font-medium">Show a WhatsApp button</span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            </div>
            {errors.acceptsCalls && (
              <p id="channels-error" role="alert" className="mt-2 text-xs font-medium text-destructive">
                {errors.acceptsCalls.message}
              </p>
            )}
          </Panel>

          <Panel title="Branding" description="A clear logo and cover photo make your listing stand out in search results.">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <Field id="logo" label="Logo" hint="Square image, at least 200 x 200 px">
                <Controller
                  control={control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FileUpload id="logo" purpose="logo" value={field.value} onChange={field.onChange} previewClassName="size-24" describedBy="logo-hint" onUploadingChange={trackUpload} />
                  )}
                />
              </Field>
              <Field id="cover" label="Cover image" hint="Wide image, at least 1200 x 400 px">
                <Controller
                  control={control}
                  name="coverUrl"
                  render={({ field }) => (
                    <FileUpload id="cover" purpose="cover" value={field.value} onChange={field.onChange} previewClassName="aspect-[3/1]" describedBy="cover-hint" onUploadingChange={trackUpload} />
                  )}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Location" description="Your pin decides who sees you in nearby searches.">
            <Controller
              control={control}
              name="location"
              render={({ field }) => <LocationFields value={field.value} onChange={field.onChange} errors={locationErrors(errors)} />}
            />
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-20 xl:h-fit">
          <Panel title="Profile strength">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{profile.profileCompletenessPct}%</span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
            <Progress value={profile.profileCompletenessPct} className="mt-3 h-2" />
            <ul className="mt-5 space-y-2.5">
              {profile.checklist.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-sm">
                  {c.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                  {!c.done && CHECKLIST_LINKS[c.key] ? (
                    <Link to={CHECKLIST_LINKS[c.key]} className="text-primary hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={c.done ? "text-muted-foreground" : ""}>{c.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
      <SaveBar dirty={isDirty} saving={isSubmitting || uploading > 0} onSave={() => void save()} onReset={() => reset(initial)} />
    </form>
  );
}
