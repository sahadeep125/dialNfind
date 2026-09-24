import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import type { ProviderProfile } from "@/lib/types";
import { useProfile } from "@/layouts/app-layout";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Form {
  businessName: string;
  businessType: "individual" | "company";
  description: string;
  yearsExperience: string;
  selfReportedCompletedJobs: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  website: string;
  logoUrl: string;
  coverUrl: string;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  location: LocationValue;
}

function toForm(p: ProviderProfile): Form {
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

const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

export function ProfilePage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const initial = useMemo(() => (profile ? toForm(profile) : null), [profile]);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  if (!profile || !form || !initial) return <PageSkeleton />;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  async function save() {
    if (!form) return;
    if (form.businessName.trim().length < 2) return toast.error("Enter your business name");
    if (form.phone.replace(/\D/g, "").length < 8) return toast.error("Enter a valid phone number");
    setSaving(true);
    try {
      const { location } = form;
      await api("/provider/profile", {
        method: "PATCH",
        json: {
          businessName: form.businessName.trim(),
          businessType: form.businessType,
          description: orNull(form.description),
          yearsExperience: numOrNull(form.yearsExperience),
          selfReportedCompletedJobs: numOrNull(form.selfReportedCompletedJobs),
          phone: form.phone.trim(),
          whatsappNumber: orNull(form.whatsappNumber),
          email: form.email.trim(),
          website: form.website.trim(),
          logoUrl: form.logoUrl.trim(),
          coverUrl: form.coverUrl.trim(),
          acceptsCalls: form.acceptsCalls,
          acceptsWhatsapp: form.acceptsWhatsapp,
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input id="businessName" value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Business type</Label>
                <Select value={form.businessType} onValueChange={(v) => set({ businessType: v as Form["businessType"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual professional</SelectItem>
                    <SelectItem value="company">Company or shop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years">Years in business</Label>
                  <Input id="years" type="number" min={0} max={80} value={form.yearsExperience} onChange={(e) => set({ yearsExperience: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobs">Jobs completed</Label>
                  <Input id="jobs" type="number" min={0} value={form.selfReportedCompletedJobs} onChange={(e) => set({ selfReportedCompletedJobs: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={6} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                <p className="text-xs text-muted-foreground">{form.description.length} / 2000 characters</p>
              </div>
            </div>
          </Panel>

          <Panel title="Contact" description="Customers reach you directly. DialNFind never charges per lead.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Business phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input id="whatsapp" type="tel" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} placeholder="Same as phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border p-4">
                <span className="text-sm font-medium">Show a Call button</span>
                <Switch checked={form.acceptsCalls} onCheckedChange={(v) => set({ acceptsCalls: v })} />
              </label>
              <label className="flex items-center justify-between rounded-xl border p-4">
                <span className="text-sm font-medium">Show a WhatsApp button</span>
                <Switch checked={form.acceptsWhatsapp} onCheckedChange={(v) => set({ acceptsWhatsapp: v })} />
              </label>
            </div>
          </Panel>

          <Panel title="Branding" description="Paste links to hosted images. Direct uploads arrive with cloud storage.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input id="logo" type="url" value={form.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} placeholder="https://" />
                {form.logoUrl && <img src={form.logoUrl} alt="" className="size-16 rounded-xl border object-cover" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Cover image URL</Label>
                <Input id="cover" type="url" value={form.coverUrl} onChange={(e) => set({ coverUrl: e.target.value })} placeholder="https://" />
                {form.coverUrl && <img src={form.coverUrl} alt="" className="h-16 w-full rounded-xl border object-cover" />}
              </div>
            </div>
          </Panel>

          <Panel title="Location" description="Your pin decides who sees you in nearby searches.">
            <LocationFields value={form.location} onChange={(location) => set({ location })} />
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
      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setForm(initial)} />
    </>
  );
}
