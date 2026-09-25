import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MoreHorizontal, Plus, Star, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useCategoryOptions } from "@/lib/categories";
import { DAYS, PRICE_UNITS } from "@/lib/format";
import { normalizePhone } from "@/lib/validation";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { ConfirmDialog } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { LocationEditor, locationProblems, type LocationErrors, type LocationValue } from "@/components/location-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Ownership --------------------------------------------------------------------------------------

/** Give the listing to an account (or move it to another one), or make it unclaimed again. */
export function OwnerActions({ providerId, businessName, hasOwner, onDone }: { providerId: number; businessName: string; hasOwner: boolean; onDone: () => void }) {
  const [dialog, setDialog] = useState<"assign" | "remove" | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const assign = useMutation({
    mutationFn: () => api(`/admin/providers/${providerId}/owner`, { method: "POST", json: { email: email.trim() } }),
    onSuccess: () => {
      toast.success(`${businessName} now belongs to ${email.trim()}`);
      setDialog(null);
      setEmail("");
      onDone();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api(`/admin/providers/${providerId}/owner`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("The listing is unclaimed again");
      setDialog(null);
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Owner actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("assign")}>
            <UserPlus /> {hasOwner ? "Move to another account" : "Give to an account"}
          </DropdownMenuItem>
          {hasOwner && (
            <DropdownMenuItem onSelect={() => setDialog("remove")} className="text-destructive">
              <UserMinus /> Remove owner
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={dialog === "assign"} onOpenChange={(o) => (setDialog(o ? "assign" : null), setError(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasOwner ? "Move this listing" : "Give this listing to an account"}</DialogTitle>
            <DialogDescription>The account must already exist. It becomes a business account and the owner is emailed. Use this after checking ownership outside the claim flow.</DialogDescription>
          </DialogHeader>
          <form
            id="assign-owner"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter the owner's email address");
              assign.mutate();
            }}
          >
            <Field id="owner-email" label="Owner's email" error={error ?? undefined}>
              <Input type="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(null))} {...fieldA11y("owner-email", error ?? undefined)} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit" form="assign-owner" disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="animate-spin" />} Give listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(o) => setDialog(o ? "remove" : null)}
        title="Remove the owner?"
        description={`${businessName} stays on DialNFind as an unclaimed listing. The account keeps working but can no longer manage it.`}
        confirmLabel="Remove owner"
        destructive
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

export function DeleteListingPanel({ providerId, businessName }: { providerId: number; businessName: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const del = useMutation({
    mutationFn: () => api(`/admin/providers/${providerId}`, { method: "DELETE", json: { confirmName: typed } }),
    onSuccess: () => {
      toast.success(`${businessName} was deleted`);
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
      navigate("/providers", { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Panel title="Delete listing">
      <p className="text-sm text-muted-foreground">Removes the listing with its leads, reviews and photos. Suspend it instead if it may come back.</p>
      <Button variant="outline" className="mt-4 w-full text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Delete listing
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => (setOpen(o), setTyped(""))}
        title={`Delete ${businessName}?`}
        description="This cannot be undone. The audit log keeps the name, phone and city."
        confirmLabel="Delete for good"
        destructive
        busy={del.isPending || typed.trim().toLowerCase() !== businessName.trim().toLowerCase()}
        onConfirm={() => del.mutate()}
      >
        <Field id="confirm-name" label={`Type "${businessName}" to confirm`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" {...fieldA11y("confirm-name")} />
        </Field>
      </ConfirmDialog>
    </Panel>
  );
}

// Editor -----------------------------------------------------------------------------------------

interface Profile {
  id: number;
  businessName: string;
  description: string | null;
  businessType: "individual" | "company";
  yearsExperience: number | null;
  phone: string;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  addressLine: string | null;
  locality: string | null;
  city: string;
  state: string;
  pincode: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
  isAvailable: boolean;
  businessHours: { dayOfWeek: number; openTime: string | null; closeTime: string | null; is24x7: boolean }[];
  serviceAreas: { areaName: string; pincode: string | null }[];
  services: { categoryId: number; subcategoryId: number | null; startingPrice: number | null; priceUnit: string; isPrimary: boolean }[];
}

type Details = Pick<Profile, "businessName" | "description" | "businessType" | "yearsExperience" | "phone" | "whatsappNumber" | "email" | "website" | "acceptsCalls" | "acceptsWhatsapp" | "isAvailable">;

function useSection<T>(initial: T | undefined) {
  const [value, setValue] = useState<T | undefined>(initial);
  const [base, setBase] = useState(initial);
  useEffect(() => {
    setValue(initial);
    setBase(initial);
  }, [initial]);
  return { value, set: setValue, dirty: JSON.stringify(value) !== JSON.stringify(base), reset: () => setValue(base) };
}

/** Edit every part of a listing on behalf of the business: details, location, services, hours and areas. */
export function ProviderEditPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-provider-profile", id], queryFn: () => api<{ provider: Profile }>(`/admin/providers/${id}/profile`).then((r) => r.provider) });
  const onSaved = (p: { provider: Profile }) => {
    qc.setQueryData(["admin-provider-profile", id], p.provider);
    void qc.invalidateQueries({ queryKey: ["admin-provider", id] });
    void qc.invalidateQueries({ queryKey: ["admin-providers"] });
    toast.success("Saved");
  };
  if (!data) return <PageSkeleton />;
  return (
    <>
      <Link to={`/providers/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {data.businessName}
      </Link>
      <PageHeader title="Edit listing" description="Changes go live straight away and are recorded in the audit log. Each section saves on its own." />
      <div className="space-y-6">
        <DetailsSection id={id!} profile={data} onSaved={onSaved} />
        <LocationSection id={id!} profile={data} onSaved={onSaved} />
        <ServicesSection id={id!} profile={data} onSaved={onSaved} />
        <HoursSection id={id!} profile={data} onSaved={onSaved} />
        <AreasSection id={id!} profile={data} onSaved={onSaved} />
      </div>
    </>
  );
}

type SectionProps = { id: string; profile: Profile; onSaved: (p: { provider: Profile }) => void };

function DetailsSection({ id, profile, onSaved }: SectionProps) {
  const pick = (p: Profile): Details => ({
    businessName: p.businessName,
    description: p.description,
    businessType: p.businessType,
    yearsExperience: p.yearsExperience,
    phone: p.phone,
    whatsappNumber: p.whatsappNumber,
    email: p.email,
    website: p.website,
    acceptsCalls: p.acceptsCalls,
    acceptsWhatsapp: p.acceptsWhatsapp,
    isAvailable: p.isAvailable,
  });
  const initial = useMemo(() => pick(profile), [profile]);
  const s = useSection<Details>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const save = useMutation({
    mutationFn: (v: Details) => api<{ provider: Profile }>(`/admin/providers/${id}/profile`, { method: "PATCH", json: { ...v, email: v.email ?? "", website: v.website || null, whatsappNumber: v.whatsappNumber ?? "" } }),
    onSuccess: onSaved,
  });
  const v = s.value!;
  const set = (patch: Partial<Details>) => s.set({ ...v, ...patch });
  function submit() {
    const next: typeof errors = {};
    if (v.businessName.trim().length < 2) next.businessName = "Enter the business name";
    if (!normalizePhone(v.phone)) next.phone = "Enter a valid 10-digit Indian phone number";
    if (v.whatsappNumber && !normalizePhone(v.whatsappNumber)) next.whatsappNumber = "Enter a valid number or leave it empty";
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) next.email = "Enter a valid email or leave it empty";
    if (v.website && !/^https?:\/\/\S+\.\S+/.test(v.website)) next.website = "Use a full link starting with https://";
    setErrors(next);
    if (!Object.keys(next).length) save.mutate(v);
  }
  return (
    <Panel title="Business details">
      <FormAlert message={save.error ? errorMessage(save.error) : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="e-name" label="Business name" required error={errors.businessName} className="sm:col-span-2">
          <Input value={v.businessName} maxLength={100} onChange={(e) => set({ businessName: e.target.value })} {...fieldA11y("e-name", errors.businessName)} />
        </Field>
        <Field id="e-desc" label="About" optional className="sm:col-span-2">
          <Textarea rows={4} maxLength={2000} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} {...fieldA11y("e-desc")} />
        </Field>
        <Field id="e-phone" label="Business phone" required error={errors.phone}>
          <Input value={v.phone} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} {...fieldA11y("e-phone", errors.phone)} />
        </Field>
        <Field id="e-wa" label="WhatsApp number" optional error={errors.whatsappNumber}>
          <Input value={v.whatsappNumber ?? ""} inputMode="tel" onChange={(e) => set({ whatsappNumber: e.target.value || null })} {...fieldA11y("e-wa", errors.whatsappNumber)} />
        </Field>
        <Field id="e-email" label="Business email" optional error={errors.email}>
          <Input type="email" value={v.email ?? ""} onChange={(e) => set({ email: e.target.value || null })} {...fieldA11y("e-email", errors.email)} />
        </Field>
        <Field id="e-web" label="Website" optional error={errors.website}>
          <Input value={v.website ?? ""} placeholder="https://" onChange={(e) => set({ website: e.target.value || null })} {...fieldA11y("e-web", errors.website)} />
        </Field>
        <Field id="e-type" label="Type">
          <Select value={v.businessType} onValueChange={(t) => set({ businessType: t as Details["businessType"] })}>
            <SelectTrigger id="e-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="company">Company or shop</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="e-years" label="Years of experience" optional>
          <Input inputMode="numeric" value={v.yearsExperience ?? ""} onChange={(e) => set({ yearsExperience: e.target.value ? Math.min(80, Number(e.target.value.replace(/\D/g, ""))) : null })} {...fieldA11y("e-years")} />
        </Field>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["acceptsCalls", "Takes calls"],
            ["acceptsWhatsapp", "Takes WhatsApp"],
            ["isAvailable", "Available for work"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium">
            {label}
            <Switch checked={v[key]} onCheckedChange={(c) => set({ [key]: c })} />
          </label>
        ))}
      </div>
      <SaveBar dirty={s.dirty} saving={save.isPending} onSave={submit} onReset={s.reset} />
    </Panel>
  );
}

function LocationSection({ id, profile, onSaved }: SectionProps) {
  const pick = (p: Profile): LocationValue => ({
    addressLine: p.addressLine ?? "",
    locality: p.locality ?? "",
    city: p.city,
    state: p.state,
    pincode: p.pincode ?? "",
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    serviceRadiusKm: p.serviceRadiusKm,
  });
  const initial = useMemo(() => pick(profile), [profile]);
  const s = useSection<LocationValue>(initial);
  const [errors, setErrors] = useState<LocationErrors | null>(null);
  const save = useMutation({
    mutationFn: (v: LocationValue) =>
      api<{ provider: Profile }>(`/admin/providers/${id}/profile`, {
        method: "PATCH",
        json: { ...v, addressLine: v.addressLine || null, locality: v.locality || null, pincode: v.pincode || null },
      }),
    onSuccess: onSaved,
  });
  return (
    <Panel title="Location">
      <FormAlert message={save.error ? errorMessage(save.error) : null} />
      <LocationEditor idPrefix="edit" value={s.value!} onChange={s.set} errors={errors} />
      <SaveBar
        dirty={s.dirty}
        saving={save.isPending}
        onReset={s.reset}
        onSave={() => {
          const problems = locationProblems(s.value!);
          setErrors(problems);
          if (!problems) save.mutate(s.value!);
        }}
      />
    </Panel>
  );
}

type ServiceRow = Profile["services"][number];

function ServicesSection({ id, profile, onSaved }: SectionProps) {
  const { data: categories = [] } = useCategoryOptions();
  const initial = useMemo(() => profile.services.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice: startingPrice === null ? null : Number(startingPrice), priceUnit, isPrimary })), [profile]);
  const s = useSection<ServiceRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (services: ServiceRow[]) => api<{ provider: Profile }>(`/admin/providers/${id}/services`, { method: "PUT", json: { services } }),
    onSuccess: onSaved,
  });
  const rows = s.value ?? [];
  const update = (i: number, patch: Partial<ServiceRow>) => s.set(rows.map((r, j) => (j === i ? { ...r, ...patch } : patch.isPrimary ? { ...r, isPrimary: false } : r)));
  return (
    <Panel
      title="Services"
      description="The starred service decides the main category the listing appears under."
      actions={
        <Button size="sm" variant="outline" disabled={rows.length >= 30 || !categories.length} onClick={() => s.set([...rows, { categoryId: categories[0].id, subcategoryId: null, startingPrice: null, priceUnit: "per_visit", isPrimary: rows.length === 0 }])}>
          <Plus /> Add service
        </Button>
      }
    >
      <FormAlert message={error ?? (save.error ? errorMessage(save.error) : null)} />
      <ul className="space-y-3">
        {rows.map((r, i) => {
          const cat = categories.find((c) => c.id === r.categoryId);
          return (
            <li key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr_8rem_9rem_auto] sm:items-center">
              <Button variant="ghost" size="icon-sm" aria-label={r.isPrimary ? "Main service" : "Make this the main service"} aria-pressed={r.isPrimary} onClick={() => update(i, { isPrimary: true })}>
                <Star className={r.isPrimary ? "fill-warning text-warning" : "text-muted-foreground"} />
              </Button>
              <Select value={String(r.categoryId)} onValueChange={(v) => update(i, { categoryId: Number(v), subcategoryId: null })}>
                <SelectTrigger className="w-full" aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={r.subcategoryId ? String(r.subcategoryId) : "all"} onValueChange={(v) => update(i, { subcategoryId: v === "all" ? null : Number(v) })}>
                <SelectTrigger className="w-full" aria-label="Service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole category</SelectItem>
                  {cat?.subcategories.map((sc) => (
                    <SelectItem key={sc.id} value={String(sc.id)}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input aria-label="Starting price in rupees" placeholder="Price" inputMode="numeric" value={r.startingPrice ?? ""} onChange={(e) => update(i, { startingPrice: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} />
              <Select value={r.priceUnit} onValueChange={(v) => update(i, { priceUnit: v })}>
                <SelectTrigger className="w-full" aria-label="Price unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon-sm" aria-label="Remove service" onClick={() => s.set(rows.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
      <SaveBar
        dirty={s.dirty}
        saving={save.isPending}
        onReset={() => (s.reset(), setError(null))}
        onSave={() => {
          if (!rows.length) return setError("Keep at least one service");
          setError(null);
          save.mutate(rows.some((r) => r.isPrimary) ? rows : rows.map((r, i) => ({ ...r, isPrimary: i === 0 })));
        }}
      />
    </Panel>
  );
}

type Day = { open: boolean; is24x7: boolean; openTime: string; closeTime: string };

function HoursSection({ id, profile, onSaved }: SectionProps) {
  const toDays = (p: Profile): Day[] =>
    DAYS.map((_, d) => {
      const h = p.businessHours.find((x) => x.dayOfWeek === d);
      return { open: !!h && (h.is24x7 || !!h.openTime), is24x7: h?.is24x7 ?? false, openTime: h?.openTime ?? "09:00", closeTime: h?.closeTime ?? "19:00" };
    });
  const initial = useMemo(() => toDays(profile), [profile]);
  const s = useSection<Day[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (days: Day[]) =>
      api<{ provider: Profile }>(`/admin/providers/${id}/hours`, {
        method: "PUT",
        json: { hours: days.map((d, dayOfWeek) => (d.open ? { dayOfWeek, is24x7: d.is24x7, openTime: d.is24x7 ? null : d.openTime, closeTime: d.is24x7 ? null : d.closeTime } : { dayOfWeek, is24x7: false, openTime: null, closeTime: null })) },
      }),
    onSuccess: onSaved,
  });
  const days = s.value ?? [];
  const setDay = (i: number, patch: Partial<Day>) => s.set(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <Panel title="Opening hours">
      <FormAlert message={error ?? (save.error ? errorMessage(save.error) : null)} />
      <ul className="divide-y">
        {days.map((d, i) => (
          <li key={DAYS[i]} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
            <Switch checked={d.open} onCheckedChange={(c) => setDay(i, { open: c })} aria-label={`Open on ${DAYS[i]}`} />
            {d.open ? (
              <>
                <label className="flex items-center gap-1.5 text-sm">
                  <Switch checked={d.is24x7} onCheckedChange={(c) => setDay(i, { is24x7: c })} /> 24 hours
                </label>
                {!d.is24x7 && (
                  <span className="flex items-center gap-2">
                    <Input type="time" className="w-32" value={d.openTime} onChange={(e) => setDay(i, { openTime: e.target.value })} aria-label={`${DAYS[i]} opening time`} />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input type="time" className="w-32" value={d.closeTime} onChange={(e) => setDay(i, { closeTime: e.target.value })} aria-label={`${DAYS[i]} closing time`} />
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </li>
        ))}
      </ul>
      <SaveBar
        dirty={s.dirty}
        saving={save.isPending}
        onReset={() => (s.reset(), setError(null))}
        onSave={() => {
          const bad = days.findIndex((d) => d.open && !d.is24x7 && (!d.openTime || !d.closeTime || d.closeTime === d.openTime));
          if (bad >= 0) return setError(`Check the times for ${DAYS[bad]}`);
          setError(null);
          save.mutate(days);
        }}
      />
    </Panel>
  );
}

function AreasSection({ id, profile, onSaved }: SectionProps) {
  const initial = useMemo(() => profile.serviceAreas.map((a) => a.areaName), [profile]);
  const s = useSection<string[]>(initial);
  const [draft, setDraft] = useState("");
  const save = useMutation({
    mutationFn: (areas: string[]) => api<{ provider: Profile }>(`/admin/providers/${id}/service-areas`, { method: "PUT", json: { serviceAreas: areas.map((areaName) => ({ areaName })) } }),
    onSuccess: onSaved,
  });
  const areas = s.value ?? [];
  const add = () => {
    const name = draft.trim();
    if (name.length < 2 || areas.some((a) => a.toLowerCase() === name.toLowerCase()) || areas.length >= 50) return;
    s.set([...areas, name]);
    setDraft("");
  };
  return (
    <Panel title="Service areas" description="Localities the business travels to, besides its own.">
      <FormAlert message={save.error ? errorMessage(save.error) : null} />
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <span key={a} className="inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm">
            {a}
            <button type="button" className="cursor-pointer rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${a}`} onClick={() => s.set(areas.filter((x) => x !== a))}>
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
        {!areas.length && <span className="text-sm text-muted-foreground">No extra areas.</span>}
      </div>
      <div className="mt-4 flex gap-2">
        <Label htmlFor="area-new" className="sr-only">
          New area
        </Label>
        <Input id="area-new" value={draft} maxLength={80} placeholder="e.g. Pradhan Nagar" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      <SaveBar dirty={s.dirty} saving={save.isPending} onSave={() => save.mutate(areas)} onReset={s.reset} />
    </Panel>
  );
}
