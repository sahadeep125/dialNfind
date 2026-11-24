import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Hours, Profession, ProviderProfile, ProviderService, ServiceArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { normalizePhone, optionalEmail, optionalInt, optionalPhone, optionalUrl, phone as phoneRule } from "@/lib/validation";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AreasEditor, DEFAULT_HOURS, HoursEditor, normalizeHours, ServicesEditor, useProfessions, validateHours, validateServices } from "@/components/editors";
import { ACCOUNT_TYPES, AccountTypeBadge } from "@/components/account-type";
import { LocationFields, validateLocation, type LocationErrors, type LocationValue } from "@/components/location-fields";

/** Steps of a first listing. Adding another profession skips "Account type": the account is already an individual's. */
const ALL_STEPS = ["Account type", "About", "Services", "Location", "Hours", "Contact"];

const businessSchema = z
  .object({
    businessName: z.string().trim().max(100, "Keep the name under 100 characters"),
    businessType: z.enum(["individual", "company"]),
    profession: z.string().trim().max(80, "Keep the title under 80 characters"),
    professionKey: z.string(),
    yearsExperience: optionalInt(0, 80, "Years of experience"),
    description: z.string().trim().max(2000, "Keep the description under 2,000 characters"),
  })
  .superRefine((b, ctx) => {
    if (b.businessName.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessName"], message: b.businessType === "individual" ? "Enter your full name" : "Enter your business name" });
    }
    if (b.businessType === "individual" && !b.professionKey) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["professionKey"], message: "Pick your profession" });
  });

/** A profession's key in the picker: its category and service. */
const professionKey = (p: Pick<Profession, "categoryId" | "subcategoryId">) => `${p.categoryId}:${p.subcategoryId ?? ""}`;

const contactSchema = z
  .object({
    phone: phoneRule,
    whatsappNumber: optionalPhone,
    email: optionalEmail,
    website: optionalUrl,
    acceptsCalls: z.boolean(),
    acceptsWhatsapp: z.boolean(),
  })
  .refine((c) => c.acceptsCalls || c.acceptsWhatsapp, { message: "Turn on at least one way for customers to reach you", path: ["acceptsCalls"] });

type Errors = Record<string, string>;

function collect(result: z.SafeParseReturnType<unknown, unknown>): Errors {
  const out: Errors = {};
  if (!result.success) for (const i of result.error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

interface Draft {
  step: number;
  business: {
    businessName: string;
    businessType: "individual" | "company";
    /** The picked profession (professionKey), individuals only. */
    professionKey: string;
    /** An optional title of their own, "Master Plumber". */
    profession: string;
    yearsExperience: string;
    description: string;
  };
  services: ProviderService[];
  location: LocationValue;
  areas: ServiceArea[];
  hours: Hours[];
  contact: { phone: string; whatsappNumber: string; email: string; website: string; acceptsCalls: boolean; acceptsWhatsapp: boolean };
}

export function OnboardingPage() {
  const { user, providerState, signIn, refresh, switchListing } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // An individual professional adding another profession: a new listing under the same account.
  const adding = params.get("add") === "1" && !!providerState?.provider && providerState.provider.businessType === "individual" && !!providerState.canAddListing;
  const STEPS = adding ? ALL_STEPS.slice(1) : ALL_STEPS;
  const draftKey = `kjv_onboarding_${user?.id ?? "anon"}${adding ? "_add" : ""}`;
  // Picks up where the person left off if they refreshed or came back later.
  const [draft] = useState(() => loadDraft<Draft>(draftKey));
  const [step, setStep] = useState(draft?.step ?? 0);
  const [saving, setSaving] = useState(false);
  const { data: professions = [] } = useProfessions();

  const [business, setBusiness] = useState<Draft["business"]>(
    draft?.business ?? { businessName: adding ? (providerState?.provider?.businessName ?? "") : (user?.name ?? ""), businessType: "individual", professionKey: "", profession: "", yearsExperience: "", description: "" },
  );
  const individual = adding || business.businessType === "individual";
  const picked = professions.find((p) => professionKey(p) === business.professionKey) ?? null;
  // The step's name decides what it shows, so the numbering can skip "Account type".
  const current = STEPS[step] ?? STEPS[0]!;
  const [services, setServices] = useState<ProviderService[]>(draft?.services ?? []);
  const [location, setLocation] = useState<LocationValue>(draft?.location ?? {
    addressLine: "",
    locality: "",
    city: "Siliguri",
    state: "West Bengal",
    pincode: "",
    latitude: 26.7271,
    longitude: 88.3953,
    serviceRadiusKm: 10,
  });
  const [areas, setAreas] = useState<ServiceArea[]>(draft?.areas ?? []);
  const [hours, setHours] = useState<Hours[]>(draft?.hours ?? DEFAULT_HOURS);
  const [contact, setContact] = useState<Draft["contact"]>(
    draft?.contact ?? { phone: user?.phone ?? "", whatsappNumber: "", email: user?.email ?? "", website: "", acceptsCalls: true, acceptsWhatsapp: true },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [locationErrors, setLocationErrors] = useState<LocationErrors | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const clear = (key: string) => errors[key] && setErrors(({ [key]: _, ...rest }) => rest);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftKey, { step, business, services, location, areas, hours, contact } satisfies Draft), 400);
    return () => clearTimeout(t);
  }, [draftKey, step, business, services, location, areas, hours, contact]);

  // A new profession starts from the current listing's location, hours and contact details.
  const { data: current0 } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<{ provider: ProviderProfile }>("/provider/profile").then((r) => r.provider),
    enabled: adding && !draft,
  });
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!current0 || prefilled || draft) return;
    setPrefilled(true);
    setBusiness((b) => ({ ...b, businessName: current0.businessName, yearsExperience: current0.yearsExperience?.toString() ?? "" }));
    setLocation({
      addressLine: current0.addressLine ?? "",
      locality: current0.locality ?? "",
      city: current0.city,
      state: current0.state,
      pincode: current0.pincode ?? "",
      latitude: current0.latitude,
      longitude: current0.longitude,
      serviceRadiusKm: current0.serviceRadiusKm,
    });
    setAreas(current0.serviceAreas.map(({ areaName, pincode, latitude, longitude }) => ({ areaName, pincode, latitude, longitude })));
    if (current0.businessHours.length) setHours(normalizeHours(current0.businessHours));
    setContact({
      phone: current0.phone,
      whatsappNumber: current0.whatsappNumber ?? "",
      email: current0.email ?? "",
      website: current0.website ?? "",
      acceptsCalls: current0.acceptsCalls,
      acceptsWhatsapp: current0.acceptsWhatsapp,
    });
  }, [current0, prefilled, draft]);

  if (providerState?.provider && !adding) return <Navigate to="/" replace />;

  /** Picking a profession sets the listing's main service; the Services step adds more from that category. */
  function pickProfession(p: Profession) {
    setBusiness({ ...business, professionKey: professionKey(p) });
    clear("professionKey");
    const keep = services.filter((s) => s.categoryId === p.categoryId && s.subcategoryId !== p.subcategoryId).map((s) => ({ ...s, isPrimary: false }));
    setServices([{ categoryId: p.categoryId, subcategoryId: p.subcategoryId, startingPrice: null, priceUnit: "per_visit", isPrimary: true }, ...keep]);
  }

  function pickType(t: "individual" | "company") {
    setBusiness({ ...business, businessType: t });
    // A business may cover several categories; an individual's listing is one profession.
    if (t === "individual" && picked) setServices(services.filter((s) => s.categoryId === picked.categoryId));
  }

  /** Validates the current step, shows its errors inline, and returns true when it can move on. */
  function validate(): boolean {
    setFormError(null);
    if (current === "Account type") return true;
    if (current === "About") {
      const e = collect(businessSchema.safeParse({ ...business, businessType: individual ? "individual" : "company" }));
      setErrors(e);
      return !Object.keys(e).length;
    }
    if (current === "Services") {
      let msg = validateServices(services);
      if (!msg && individual && new Set(services.map((s) => s.categoryId)).size > 1) msg = "This listing is for one profession. Add other professions as separate listings later.";
      setErrors(msg ? { services: msg } : {});
      return !msg;
    }
    if (current === "Location") {
      const e = validateLocation(location);
      setLocationErrors(e);
      return !e;
    }
    if (current === "Hours") {
      const bad = validateHours(hours);
      setErrors(bad ? { hours: "Fix the highlighted days" } : {});
      return !bad;
    }
    const e = collect(contactSchema.safeParse(contact));
    setErrors(e);
    return !Object.keys(e).length;
  }

  function next() {
    if (!validate()) return;
    track("onboarding_step_completed", { step: step + 1, step_name: STEPS[step], total_steps: STEPS.length });
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  }

  async function submit() {
    setSaving(true);
    try {
      const type = individual ? "individual" : "company";
      const res = await api<{ token: string | null; provider: { id: number } }>("/provider/onboarding", {
        method: "POST",
        json: {
          businessName: business.businessName.trim(),
          businessType: type,
          profession: individual ? business.profession.trim() || null : null,
          yearsExperience: business.yearsExperience.trim() === "" ? null : Number(business.yearsExperience),
          description: business.description.trim() || undefined,
          ...location,
          addressLine: location.addressLine || undefined,
          locality: location.locality || undefined,
          pincode: location.pincode || undefined,
          phone: normalizePhone(contact.phone),
          whatsappNumber: normalizePhone(contact.whatsappNumber || contact.phone),
          email: contact.email.trim(),
          website: contact.website.trim(),
          acceptsCalls: contact.acceptsCalls,
          acceptsWhatsapp: contact.acceptsWhatsapp,
          services: services.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary })),
          serviceAreas: areas,
          hours,
        },
      });
      clearDraft(draftKey);
      track("onboarding_completed", { service_count: services.length, area_count: areas.length, business_type: type, added_profession: adding });
      if (res.token) await signIn(res.token);
      if (adding) await switchListing(res.provider.id);
      else if (!res.token) await refresh();
      toast.success(adding ? "Your new profession is listed" : individual ? "You are listed on KaajVa" : "Your business is listed on KaajVa");
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-brand-deep">{adding ? "Add another profession" : "Create your listing"}</h1>
      <p className="mt-2 text-muted-foreground">
        {adding
          ? "Each profession gets its own listing under your name, so customers find you for each one. Your contact details and location are filled in from your current listing."
          : "A few quick steps. No business registration needed, and you can change everything later from your dashboard."}
      </p>

      <ol className="mt-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                i < step ? "cursor-pointer bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </button>
            <span className={cn("hidden text-sm font-medium md:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-success" : "bg-border")} />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        {current === "Account type" && (
          <div className="space-y-5">
            <StepTitle title="How do you work?" subtitle="This decides how your listing looks to customers. Most people on KaajVa work for themselves." />
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
              {(["individual", "company"] as const).map((t) => {
                const Icon = t === "individual" ? UserRound : Building2;
                const on = business.businessType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickType(t)}
                    className={cn("flex cursor-pointer flex-col gap-3 rounded-2xl border p-5 text-left transition-colors", on ? "border-primary bg-accent" : "hover:bg-muted")}
                  >
                    <span className={cn("flex size-11 items-center justify-center rounded-xl", t === "individual" ? "bg-brand-accent-soft text-brand-accent-strong" : "bg-accent text-primary")}>
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 font-semibold">
                        {ACCOUNT_TYPES[t].label}
                        {t === "individual" && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Most popular</span>}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {t === "individual"
                          ? "You offer services yourself: plumber, electrician, tutor, driver, photographer... Listed under your own name, one listing per profession."
                          : "A shop, service centre, agency or team. Listed under the business name, with all its categories."}
                      </span>
                      <span className="mt-2 block text-xs font-medium text-foreground/70">
                        Shown as: {t === "individual" ? "Deep Saha – Plumber – Ghoraguli" : "ABC Services – Plumbing & Electrical – Siliguri"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {current === "About" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StepTitle
                title={individual ? "About you" : "Tell us about your business"}
                subtitle={individual ? "Customers see your name and profession first." : "This is what customers see first."}
              />
              <AccountTypeBadge type={individual ? "individual" : "company"} />
            </div>
            <Field id="businessName" label={ACCOUNT_TYPES[individual ? "individual" : "company"].nameLabel} error={errors.businessName} required>
              <Input
                {...fieldA11y("businessName", errors.businessName)}
                maxLength={100}
                value={business.businessName}
                readOnly={adding}
                onChange={(e) => {
                  setBusiness({ ...business, businessName: e.target.value });
                  clear("businessName");
                }}
                placeholder={ACCOUNT_TYPES[individual ? "individual" : "company"].namePlaceholder}
                autoFocus={!adding}
              />
            </Field>
            {adding && <p className="-mt-3 text-xs text-muted-foreground">Your name is shared by all your listings. Change it from Profile details.</p>}
            {individual && (
              <>
                <ProfessionPicker
                  professions={professions}
                  value={business.professionKey}
                  taken={adding ? (providerState?.listings ?? []).map((l) => l.professionLabel?.toLowerCase() ?? "") : []}
                  error={errors.professionKey}
                  onPick={pickProfession}
                />
                <Field
                  id="profession"
                  label="Your title"
                  error={errors.profession}
                  hint={`Shown after your name. Leave empty to use "${picked?.label ?? "your profession"}".`}
                  optional
                >
                  <Input
                    {...fieldA11y("profession", errors.profession, true)}
                    maxLength={80}
                    value={business.profession}
                    onChange={(e) => {
                      setBusiness({ ...business, profession: e.target.value });
                      clear("profession");
                    }}
                    placeholder={picked ? `e.g. Senior ${picked.label}` : "e.g. Senior Plumber"}
                  />
                </Field>
              </>
            )}
            <Field id="years" label="Years of experience" error={errors.yearsExperience} optional>
              <Input
                {...fieldA11y("years", errors.yearsExperience)}
                inputMode="numeric"
                value={business.yearsExperience}
                onChange={(e) => {
                  setBusiness({ ...business, yearsExperience: e.target.value.replace(/\D/g, "").slice(0, 2) });
                  clear("yearsExperience");
                }}
                className="w-32"
              />
            </Field>
            <Field
              id="description"
              label={individual ? "About your work" : "Description"}
              error={errors.description}
              hint={`${business.description.length} of 2,000 characters. 80 or more helps you rank higher.`}
              optional
            >
              <Textarea
                {...fieldA11y("description", errors.description, true)}
                rows={5}
                maxLength={2000}
                value={business.description}
                onChange={(e) => {
                  setBusiness({ ...business, description: e.target.value });
                  clear("description");
                }}
                placeholder={
                  individual
                    ? "What jobs you take on, the brands or areas you know, how quickly you can come..."
                    : "What do you fix or offer, which brands, what makes you reliable, warranty..."
                }
              />
            </Field>
          </div>
        )}

        {current === "Services" && (
          <div className="space-y-5">
            <StepTitle
              title={individual ? `Your services as ${business.profession.trim() || picked?.label || "a professional"}` : "What services do you offer?"}
              subtitle="Customers find you through these. Add a starting price so they know what to expect."
            />
            <ServicesEditor
              lockCategoryId={individual ? (picked?.categoryId ?? null) : null}
              value={services}
              onChange={(v) => {
                setServices(v);
                clear("services");
              }}
            />
            {errors.services && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.services}
              </p>
            )}
          </div>
        )}

        {current === "Location" && (
          <div className="space-y-8">
            <StepTitle title="Where are you based?" subtitle="We show you to customers within your travel distance." />
            <LocationFields
              value={location}
              errors={locationErrors}
              onChange={(v) => {
                setLocation(v);
                if (locationErrors) setLocationErrors(validateLocation(v));
              }}
            />
            <div className="space-y-3">
              <Label>Localities you serve (optional)</Label>
              <AreasEditor value={areas} onChange={setAreas} />
            </div>
          </div>
        )}

        {current === "Hours" && (
          <div className="space-y-5">
            <StepTitle title="When can customers call you?" subtitle="We show an Open now label during these hours." />
            <HoursEditor value={hours} onChange={setHours} />
            {errors.hours && validateHours(hours) && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.hours}
              </p>
            )}
          </div>
        )}

        {current === "Contact" && (
          <div className="space-y-5">
            <StepTitle title="How should customers reach you?" subtitle="Your number is shown on your profile so customers can call directly." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label={individual ? "Phone number" : "Business phone"} error={errors.phone} required>
                <Input
                  {...fieldA11y("phone", errors.phone)}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={16}
                  value={contact.phone}
                  onChange={(e) => {
                    setContact({ ...contact, phone: e.target.value });
                    clear("phone");
                  }}
                  placeholder="98xxx xxxxx"
                />
              </Field>
              <Field id="whatsapp" label="WhatsApp number" error={errors.whatsappNumber} hint="Leave empty to use the phone number above" optional>
                <Input
                  {...fieldA11y("whatsapp", errors.whatsappNumber, true)}
                  type="tel"
                  inputMode="tel"
                  maxLength={16}
                  value={contact.whatsappNumber}
                  onChange={(e) => {
                    setContact({ ...contact, whatsappNumber: e.target.value });
                    clear("whatsappNumber");
                  }}
                  placeholder="Same as phone"
                />
              </Field>
              <Field id="email" label={individual ? "Email" : "Business email"} error={errors.email} optional>
                <Input
                  {...fieldA11y("email", errors.email)}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={contact.email}
                  onChange={(e) => {
                    setContact({ ...contact, email: e.target.value });
                    clear("email");
                  }}
                />
              </Field>
              <Field id="website" label="Website" error={errors.website} optional>
                <Input
                  {...fieldA11y("website", errors.website)}
                  type="url"
                  inputMode="url"
                  maxLength={500}
                  value={contact.website}
                  onChange={(e) => {
                    setContact({ ...contact, website: e.target.value });
                    clear("website");
                  }}
                  placeholder="https://"
                />
              </Field>
            </div>
            <div className="space-y-3 rounded-xl border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Show a Call button</span>
                <Switch
                  checked={contact.acceptsCalls}
                  onCheckedChange={(v) => {
                    setContact({ ...contact, acceptsCalls: v });
                    clear("acceptsCalls");
                  }}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Show a WhatsApp button</span>
                <Switch
                  checked={contact.acceptsWhatsapp}
                  onCheckedChange={(v) => {
                    setContact({ ...contact, acceptsWhatsapp: v });
                    clear("acceptsCalls");
                  }}
                />
              </label>
              {errors.acceptsCalls && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.acceptsCalls}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-accent p-4 text-sm">
              <div className="font-semibold text-accent-foreground">Ready to go live</div>
              <p className="mt-1 text-muted-foreground">
                {[business.businessName || (individual ? "You" : "Your business"), individual ? business.profession.trim() || picked?.label : null, location.locality || location.city]
                  .filter(Boolean)
                  .join(" – ")}{" "}
                · {services.length} services · {location.serviceRadiusKm} km radius
              </p>
            </div>
          </div>
        )}

        {formError && (
          <div className="mt-6">
            <FormAlert message={formError} />
          </div>
        )}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={() => {
              setErrors({});
              setFormError(null);
              if (step === 0) navigate(adding ? "/" : "/start");
              else setStep(step - 1);
            }}
          >
            <ArrowLeft /> Back
          </Button>
          <Button onClick={next} disabled={saving} size="lg">
            {saving && <Loader2 className="animate-spin" />}
            {step === STEPS.length - 1 ? "Publish my listing" : "Continue"} {step < STEPS.length - 1 && <ArrowRight />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The professions an individual can list under, searchable. Professions the account already lists are marked. */
function ProfessionPicker({
  professions,
  value,
  taken,
  error,
  onPick,
}: {
  professions: Profession[];
  value: string;
  taken: string[];
  error?: string;
  onPick: (p: Profession) => void;
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = term ? professions.filter((p) => `${p.label} ${p.categoryName} ${p.subcategoryName ?? ""}`.toLowerCase().includes(term)) : professions;
  return (
    <div className="space-y-2">
      <Label htmlFor="profession-search">
        Your profession <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="profession-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: plumber, electrician, tutor..." className="pl-9" />
      </div>
      <div role="radiogroup" aria-label="Professions" aria-invalid={!!error || undefined} className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pt-1">
        {shown.map((p) => {
          const key = professionKey(p);
          const on = key === value;
          const already = taken.includes(p.label.toLowerCase());
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={already}
              title={already ? "You already have a listing for this profession" : p.categoryName}
              onClick={() => onPick(p)}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
              )}
            >
              {p.label}
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No profession matches. Try another word, or pick the closest one and type your own title below.</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
