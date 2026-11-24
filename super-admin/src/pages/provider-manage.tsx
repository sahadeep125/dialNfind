import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MoreHorizontal, Plus, Search, Star, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useCategoryOptions } from "@/lib/categories";
import { DAYS, PRICE_UNITS } from "@/lib/format";
import { normalizePhone } from "@/lib/validation";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton, SaveBar } from "@/components/common";
import { ConfirmDialog } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { AccountTypeTabs } from "@/components/account-type";
import { LocationEditor, locationProblems, type LocationErrors, type LocationValue } from "@/components/location-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { SeoEditor, type SeoFields } from "@/components/seo-editor";
import type { SeoAnalysis } from "@/lib/seo";

// Ownership --------------------------------------------------------------------------------------

interface OwnerCandidate {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "provider";
  provider: { id: number; businessName: string } | null;
}

/**
 * Claim the listing for a provider's account (or move it to another one), or make it unclaimed again.
 * An unclaimed listing shows a "Claim for provider" button; an owned one keeps the actions in a menu.
 */
export function OwnerActions({ providerId, businessName, hasOwner, onDone }: { providerId: number; businessName: string; hasOwner: boolean; onDone: () => void }) {
  const [dialog, setDialog] = useState<"assign" | "remove" | null>(null);
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
      {hasOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Owner actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialog("assign")}>
              <UserPlus /> Move to another account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog("remove")} className="text-destructive">
              <UserMinus /> Remove owner
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setDialog("assign")}>
          <UserPlus /> Claim for provider
        </Button>
      )}
      <ClaimForProviderDialog
        open={dialog === "assign"}
        onOpenChange={(o) => setDialog(o ? "assign" : null)}
        providerId={providerId}
        businessName={businessName}
        hasOwner={hasOwner}
        onDone={onDone}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(o) => setDialog(o ? "remove" : null)}
        title="Remove the owner?"
        description={`${businessName} stays on KaajVa as an unclaimed listing. The account keeps working but can no longer manage it.`}
        confirmLabel="Remove owner"
        destructive
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

type Owner = { kind: "existing"; user: OwnerCandidate; claimed: boolean } | { kind: "new" };

/**
 * Claim the listing for its owner: pick their account (someone who asked to claim it, or any account
 * found by search) or enter their details to create one, upload the ownership document, then confirm.
 * A new account's generated password is emailed to the owner and shown here once.
 */
function ClaimForProviderDialog({ open, onOpenChange, providerId, businessName, hasOwner, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; providerId: number; businessName: string; hasOwner: boolean; onDone: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [fresh, setFresh] = useState({ name: "", email: "", phone: "" });
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (open) return;
    setQ("");
    setDebounced("");
    setOwner(null);
    setFresh({ name: "", email: "", phone: "" });
    setDocumentUrl("");
    setError(null);
    setCreated(null);
  }, [open]);
  const { data, isFetching } = useQuery({
    queryKey: ["owner-candidates", providerId, debounced],
    queryFn: () => api<{ claims: { id: number; createdAt: string; user: OwnerCandidate }[]; users: OwnerCandidate[] }>(`/admin/providers/${providerId}/owner-candidates?q=${encodeURIComponent(debounced)}`),
    enabled: open,
    placeholderData: (prev) => prev,
  });
  const claimants = data?.claims ?? [];
  const claimantIds = new Set(claimants.map((c) => c.user.id));
  const results = debounced.length >= 2 ? (data?.users ?? []).filter((u) => !claimantIds.has(u.id)) : [];
  const busyElsewhere = owner?.kind === "existing" && owner.user.provider && owner.user.provider.id !== providerId ? owner.user.provider.businessName : null;
  // Someone who sent a claim already uploaded a document with it; everyone else needs one from the admin.
  const needsDocument = !(owner?.kind === "existing" && owner.claimed);

  const assign = useMutation({
    mutationFn: () =>
      api<{ ok: true; accountCreated: boolean; temporaryPassword?: string }>(`/admin/providers/${providerId}/owner`, {
        method: "POST",
        json: {
          ...(owner?.kind === "existing" ? { userId: owner.user.id } : { name: fresh.name.trim(), email: fresh.email.trim(), phone: fresh.phone.trim() || null }),
          ...(documentUrl ? { documentUrl } : {}),
        },
      }),
    onSuccess: (r) => {
      const to = owner?.kind === "existing" ? owner.user.name || owner.user.email : fresh.email.trim();
      toast.success(`${businessName} now belongs to ${to}. They have been emailed the listing details.`);
      void qc.invalidateQueries({ queryKey: ["claims"] });
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
      onDone();
      if (r.temporaryPassword) setCreated({ email: fresh.email.trim(), password: r.temporaryPassword });
      else onOpenChange(false);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit() {
    setError(null);
    if (!owner) return setError("Choose the owner's account or create one");
    if (owner.kind === "new") {
      if (fresh.name.trim().length < 2) return setError("Enter the owner's name");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fresh.email.trim())) return setError("Enter the owner's email address");
      if (fresh.phone.trim() && !normalizePhone(fresh.phone)) return setError("Enter a valid 10-digit phone number");
    }
    if (needsDocument && !documentUrl) return setError("Upload the document that proves ownership");
    assign.mutate();
  }

  const row = (u: OwnerCandidate, claimed: boolean) => (
    <button
      key={u.id}
      type="button"
      onClick={() => (setOwner({ kind: "existing", user: u, claimed }), setError(null))}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{u.name || u.email}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {u.email}
          {u.phone ? ` · ${u.phone}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{claimed ? "Pending claim" : u.provider ? `Manages ${u.provider.businessName}` : u.role === "provider" ? "Business account" : "Customer account"}</span>
    </button>
  );

  if (created) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listing claimed</DialogTitle>
            <DialogDescription>
              We created a business account for {created.email} and emailed them this password with the listing details. Share it yourself if the email does not arrive. It is not shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm select-all">{created.password}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(created.password).then(() => toast.success("Password copied"))}>
              Copy password
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hasOwner ? "Move this listing" : "Claim for provider"}</DialogTitle>
          <DialogDescription>
            Choose the owner's account, or enter their details to create one, and upload the document you checked. {businessName} becomes theirs straight away and they are emailed the listing details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {owner?.kind === "existing" ? (
            <div className="space-y-2">
              <Label>Claim for</Label>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <UserPlus className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{owner.user.name || owner.user.email}</span>
                  <span className="block truncate text-xs text-muted-foreground">{owner.user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOwner(null);
                    setError(null);
                  }}
                  className="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Choose a different account"
                >
                  <X className="size-4" />
                </button>
              </div>
              <FormAlert message={busyElsewhere && `This account already manages ${busyElsewhere}. Move or remove that listing first.`} />
            </div>
          ) : owner?.kind === "new" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>New account for the owner</Label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setOwner(null)}>
                  Find an existing account instead
                </Button>
              </div>
              <Field id="claim-name" label="Owner's name">
                <Input id="claim-name" value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} autoComplete="off" />
              </Field>
              <Field id="claim-email" label="Owner's email" hint="Their password is sent here">
                <Input id="claim-email" type="email" value={fresh.email} onChange={(e) => setFresh({ ...fresh, email: e.target.value })} autoComplete="off" />
              </Field>
              <Field id="claim-phone" label="Owner's phone" optional>
                <Input id="claim-phone" type="tel" value={fresh.phone} onChange={(e) => setFresh({ ...fresh, phone: e.target.value })} autoComplete="off" />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              {claimants.length > 0 && (
                <div className="space-y-1">
                  <Label>Asked to claim it</Label>
                  <div className="rounded-lg border p-1">{claimants.map((c) => row(c.user, true))}</div>
                </div>
              )}
              <Field id="owner-search" label="Find the owner's account">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="owner-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className="pl-9" autoComplete="off" autoFocus />
                </div>
              </Field>
              {debounced.length >= 2 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border p-1">
                  {results.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">{isFetching ? "Searching…" : "No active account matches."}</p> : results.map((u) => row(u, false))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOwner({ kind: "new" });
                  if (/@/.test(q)) setFresh((f) => ({ ...f, email: q.trim() }));
                  setError(null);
                }}
              >
                <Plus /> Create an account for the owner
              </Button>
            </div>
          )}
          {owner && (
            <Field id="claim-document" label="Ownership document" optional={!needsDocument} hint={needsDocument ? "Trade licence, GST certificate, shop registration or similar. JPG, PNG, WebP or PDF." : "Optional: their claim already has a document. Upload one to replace it."}>
              <FileUpload id="claim-document" purpose="document" value={documentUrl} onChange={setDocumentUrl} onUploadingChange={setUploading} />
            </Field>
          )}
          <FormAlert message={error} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!owner || !!busyElsewhere || uploading || assign.isPending} onClick={submit}>
            {assign.isPending && <Loader2 className="animate-spin" />} {hasOwner ? "Move listing" : "Claim for provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Asks the admin to type the listing's name, then deletes it for good with its leads, reviews,
 * claims and photos (the same hard delete everywhere; the audit log keeps a snapshot).
 */
export function DeleteListingDialog({
  providerId,
  businessName,
  open,
  onOpenChange,
  onDeleted,
}: {
  providerId: number;
  businessName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");
  const del = useMutation({
    mutationFn: () => api(`/admin/providers/${providerId}`, { method: "DELETE", json: { confirmName: typed } }),
    onSuccess: () => {
      toast.success(`${businessName} was deleted`);
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
      setTyped("");
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const matches = typed.trim().toLowerCase() === businessName.trim().toLowerCase();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => (onOpenChange(o), setTyped(""))}
      title={`Delete ${businessName}?`}
      description="This removes the listing with its leads, reviews, claims and photos, and cannot be undone. The audit log keeps the name, phone and city. Suspend it instead if it may come back."
      confirmLabel={del.isPending ? "Deleting…" : "Delete for good"}
      destructive
      busy={del.isPending || !matches}
      onConfirm={() => del.mutate()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches && !del.isPending) del.mutate();
        }}
      >
        <Field id={`confirm-name-${providerId}`} label={`Type "${businessName}" to confirm`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus {...fieldA11y(`confirm-name-${providerId}`)} />
        </Field>
      </form>
    </ConfirmDialog>
  );
}

export function DeleteListingPanel({ providerId, businessName }: { providerId: number; businessName: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Delete listing">
      <p className="text-sm text-muted-foreground">Removes the listing with its leads, reviews and photos. Suspend it instead if it may come back.</p>
      <Button variant="outline" className="mt-4 w-full text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Delete listing
      </Button>
      <DeleteListingDialog providerId={providerId} businessName={businessName} open={open} onOpenChange={setOpen} onDeleted={() => navigate("/providers", { replace: true })} />
    </Panel>
  );
}

// Editor -----------------------------------------------------------------------------------------

interface Profile {
  id: number;
  slug: string;
  updatedAt: string;
  businessName: string;
  description: string | null;
  businessType: "individual" | "company";
  /** An individual's title; null uses their main service's profession name. */
  profession: string | null;
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
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  seoKeywords: string[];
  seoNoIndex: boolean;
  seo: SeoAnalysis;
}

type Details = Pick<Profile, "businessName" | "description" | "businessType" | "profession" | "yearsExperience" | "phone" | "whatsappNumber" | "email" | "website" | "acceptsCalls" | "acceptsWhatsapp" | "isAvailable">;

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
  // Links to "#seo" (the SEO score in the list) land on that section once the profile has loaded.
  const loaded = !!data;
  useEffect(() => {
    if (loaded && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [loaded]);
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
        <SeoSection id={id!} profile={data} onSaved={onSaved} />
      </div>
    </>
  );
}

type SectionProps = { id: string; profile: Profile; onSaved: (p: { provider: Profile }) => void };

/** Which section of this page fixes each SEO check (server/src/services/seo.ts check keys). */
const SEO_FIX_SECTION: Record<string, string> = {
  description_length: "Business details",
  keyword_intro: "Business details",
  keyword_density: "Business details",
  readability: "Business details",
  business_name: "Business details",
  contact: "Business details",
  address: "Location",
  service_prices: "Services",
  hours: "Working hours",
  service_areas: "Service areas",
  logo: "the provider app (photos)",
  cover: "the provider app (photos)",
  photos: "the provider app (photos)",
  alt_text: "the provider app (photos)",
};

/** SEO: the search text, the live score and whether search engines may show the page. */
function SeoSection({ id, profile, onSaved }: SectionProps) {
  const fields = useMemo<SeoFields>(
    () => ({ seoTitle: profile.seoTitle, seoDescription: profile.seoDescription, focusKeyword: profile.focusKeyword, seoKeywords: profile.seoKeywords, seoNoIndex: profile.seoNoIndex }),
    [profile],
  );
  const save = useMutation({
    mutationFn: (body: SeoFields) => api<{ provider: Profile }>(`/admin/providers/${id}/profile`, { method: "PATCH", json: body }),
    onSuccess: onSaved,
  });
  return (
    <section id="seo" className="scroll-mt-20">
      <h2 className="mb-1 text-lg font-semibold">Search and Google</h2>
      <p className="mb-4 text-sm text-muted-foreground">What Google shows for this business, and the SEO score with every check. Aim for 80 or more so the page ranks for “service in Siliguri” searches.</p>
      <SeoEditor
        seo={profile.seo}
        fields={fields}
        slug={profile.slug}
        checkPath={`/admin/providers/${id}/seo/check`}
        onSave={(body) => save.mutate(body)}
        saving={save.isPending}
        saveError={save.error ? errorMessage(save.error) : null}
        allowNoIndex
        version={profile.updatedAt}
        action={(key) => (SEO_FIX_SECTION[key] ? <span className="text-xs text-muted-foreground">Fix it in {SEO_FIX_SECTION[key]}.</span> : null)}
      />
    </section>
  );
}

function DetailsSection({ id, profile, onSaved }: SectionProps) {
  const pick = (p: Profile): Details => ({
    businessName: p.businessName,
    description: p.description,
    businessType: p.businessType,
    profession: p.profession ?? null,
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
    mutationFn: (v: Details) => api<{ provider: Profile }>(`/admin/providers/${id}/profile`, { method: "PATCH", json: { ...v, profession: v.businessType === "individual" ? v.profession?.trim() || null : null, email: v.email ?? "", website: v.website || null, whatsappNumber: v.whatsappNumber ?? "" } }),
    onSuccess: onSaved,
  });
  const v = s.value!;
  const set = (patch: Partial<Details>) => s.set({ ...v, ...patch });
  function submit() {
    const next: typeof errors = {};
    if (v.businessName.trim().length < 2) next.businessName = v.businessType === "individual" ? "Enter the person's full name" : "Enter the business name";
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
        <Field id="e-name" label={v.businessType === "individual" ? "Full name" : "Business name"} required error={errors.businessName} className="sm:col-span-2">
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
        <Field id="e-type" label="Account type">
          <AccountTypeTabs id="e-type" value={v.businessType} onChange={(businessType) => set({ businessType })} />
        </Field>
        {v.businessType === "individual" && (
          <Field id="e-profession" label="Profession title" optional hint="Shown after the name. Leave empty to use the main service's profession.">
            <Input value={v.profession ?? ""} maxLength={80} placeholder="e.g. AC Technician" onChange={(e) => set({ profession: e.target.value || null })} {...fieldA11y("e-profession")} />
          </Field>
        )}
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
