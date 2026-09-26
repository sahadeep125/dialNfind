import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Hours, ProviderService, ServiceArea } from "@/lib/types";
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
import { AreasEditor, DEFAULT_HOURS, HoursEditor, ServicesEditor, validateHours, validateServices } from "@/components/editors";
import { LocationFields, validateLocation, type LocationErrors, type LocationValue } from "@/components/location-fields";

const STEPS = ["Business", "Services", "Location", "Hours", "Contact"];

const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(100, "Keep the name under 100 characters"),
  businessType: z.enum(["individual", "company"]),
  yearsExperience: optionalInt(0, 80, "Years of experience"),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters"),
});

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
  business: { businessName: string; businessType: "individual" | "company"; yearsExperience: string; description: string };
  services: ProviderService[];
  location: LocationValue;
  areas: ServiceArea[];
  hours: Hours[];
  contact: { phone: string; whatsappNumber: string; email: string; website: string; acceptsCalls: boolean; acceptsWhatsapp: boolean };
}

export function OnboardingPage() {
  const { user, providerState, signIn, refresh } = useAuth();
  const navigate = useNavigate();
  const draftKey = `dnf_onboarding_${user?.id ?? "anon"}`;
  // Picks up where the person left off if they refreshed or came back later.
  const [draft] = useState(() => loadDraft<Draft>(draftKey));
  const [step, setStep] = useState(draft?.step ?? 0);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState<Draft["business"]>(draft?.business ?? { businessName: "", businessType: "individual", yearsExperience: "", description: "" });
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

  if (providerState?.provider) return <Navigate to="/" replace />;

  /** Validates the current step, shows its errors inline, and returns true when it can move on. */
  function validate(): boolean {
    setFormError(null);
    if (step === 0) {
      const e = collect(businessSchema.safeParse(business));
      setErrors(e);
      return !Object.keys(e).length;
    }
    if (step === 1) {
      const msg = validateServices(services);
      setErrors(msg ? { services: msg } : {});
      return !msg;
    }
    if (step === 2) {
      const e = validateLocation(location);
      setLocationErrors(e);
      return !e;
    }
    if (step === 3) {
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
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await api<{ token: string | null }>("/provider/onboarding", {
        method: "POST",
        json: {
          businessName: business.businessName.trim(),
          businessType: business.businessType,
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
      if (res.token) await signIn(res.token);
      else await refresh();
      toast.success("Your business is live on DialNFind");
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-brand-deep">Set up your business</h1>
      <p className="mt-2 text-muted-foreground">Five quick steps. You can change everything later from your dashboard.</p>

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
        {step === 0 && (
          <div className="space-y-5">
            <StepTitle title="Tell us about your business" subtitle="This is what customers see first." />
            <Field id="businessName" label="Business name" error={errors.businessName} required>
              <Input
                {...fieldA11y("businessName", errors.businessName)}
                maxLength={100}
                value={business.businessName}
                onChange={(e) => {
                  setBusiness({ ...business, businessName: e.target.value });
                  clear("businessName");
                }}
                placeholder="e.g. Sharma TV & Electronics Care"
                autoFocus
              />
            </Field>
            <div className="space-y-2">
              <Label>You are</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["individual", "company"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBusiness({ ...business, businessType: t })}
                    className={cn("cursor-pointer rounded-xl border p-4 text-left transition-colors", business.businessType === t ? "border-primary bg-accent" : "hover:bg-muted")}
                  >
                    <div className="font-medium">{t === "individual" ? "An individual professional" : "A company or shop"}</div>
                    <div className="text-xs text-muted-foreground">{t === "individual" ? "Freelancer, technician, tutor" : "Team, service centre, agency"}</div>
                  </button>
                ))}
              </div>
            </div>
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
              label="Description"
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
                placeholder="What do you fix or offer, which brands, what makes you reliable, warranty..."
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <StepTitle title="What services do you offer?" subtitle="Customers find you through these. Add a starting price so they know what to expect." />
            <ServicesEditor
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

        {step === 2 && (
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

        {step === 3 && (
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

        {step === 4 && (
          <div className="space-y-5">
            <StepTitle title="How should customers reach you?" subtitle="Your number is shown on your profile so customers can call directly." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Business phone" error={errors.phone} required>
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
              <Field id="whatsapp" label="WhatsApp number" error={errors.whatsappNumber} hint="Leave empty to use your business phone" optional>
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
              <Field id="email" label="Business email" error={errors.email} optional>
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
                {business.businessName || "Your business"} · {services.length} services · {location.locality ? `${location.locality}, ` : ""}
                {location.city} · {location.serviceRadiusKm} km radius
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
              if (step === 0) navigate("/start");
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

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
