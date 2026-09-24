import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Hours, ProviderService, ServiceArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AreasEditor, DEFAULT_HOURS, HoursEditor, ServicesEditor } from "@/components/editors";
import { LocationFields, type LocationValue } from "@/components/location-fields";

const STEPS = ["Business", "Services", "Location", "Hours", "Contact"];

export function OnboardingPage() {
  const { user, providerState, signIn, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState({ businessName: "", businessType: "individual" as "individual" | "company", yearsExperience: "", description: "" });
  const [services, setServices] = useState<ProviderService[]>([]);
  const [location, setLocation] = useState<LocationValue>({
    addressLine: "",
    locality: "",
    city: "Siliguri",
    state: "West Bengal",
    pincode: "",
    latitude: 26.7271,
    longitude: 88.3953,
    serviceRadiusKm: 10,
  });
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [hours, setHours] = useState<Hours[]>(DEFAULT_HOURS);
  const [contact, setContact] = useState({ phone: user?.phone ?? "", whatsappNumber: "", email: user?.email ?? "", website: "", acceptsCalls: true, acceptsWhatsapp: true });

  if (providerState?.provider) return <Navigate to="/" replace />;

  function validate(): string | null {
    if (step === 0 && business.businessName.trim().length < 2) return "Enter your business name";
    if (step === 1 && services.length === 0) return "Pick at least one service";
    if (step === 2 && (!location.city || !location.state)) return "Enter your city and state";
    if (step === 4 && contact.phone.replace(/\D/g, "").length < 8) return "Enter a phone number customers can call";
    return null;
  }

  function next() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await api<{ token: string | null }>("/provider/onboarding", {
        method: "POST",
        json: {
          businessName: business.businessName,
          businessType: business.businessType,
          yearsExperience: business.yearsExperience === "" ? null : Number(business.yearsExperience),
          description: business.description || undefined,
          ...location,
          addressLine: location.addressLine || undefined,
          locality: location.locality || undefined,
          pincode: location.pincode || undefined,
          phone: contact.phone,
          whatsappNumber: contact.whatsappNumber || contact.phone,
          email: contact.email,
          website: contact.website,
          acceptsCalls: contact.acceptsCalls,
          acceptsWhatsapp: contact.acceptsWhatsapp,
          services: services.map(({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary })),
          serviceAreas: areas,
          hours,
        },
      });
      if (res.token) await signIn(res.token);
      else await refresh();
      toast.success("Your business is live on DialNFind");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
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
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} placeholder="e.g. Sharma TV & Electronics Care" autoFocus />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="years">Years of experience</Label>
              <Input id="years" type="number" min={0} max={80} value={business.yearsExperience} onChange={(e) => setBusiness({ ...business, yearsExperience: e.target.value })} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={business.description}
                onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                placeholder="What do you fix or offer, which brands, what makes you reliable, warranty..."
              />
              <p className="text-xs text-muted-foreground">{business.description.length} characters. 80 or more helps you rank higher.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <StepTitle title="What services do you offer?" subtitle="Customers find you through these. Add a starting price so they know what to expect." />
            <ServicesEditor value={services} onChange={setServices} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <StepTitle title="Where are you based?" subtitle="We show you to customers within your travel distance." />
            <LocationFields value={location} onChange={setLocation} />
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
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <StepTitle title="How should customers reach you?" subtitle="Your number is shown on your profile so customers can call directly." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Business phone</Label>
                <Input id="phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+91 98xxx xxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input id="whatsapp" type="tel" value={contact.whatsappNumber} onChange={(e) => setContact({ ...contact, whatsappNumber: e.target.value })} placeholder="Same as phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business email</Label>
                <Input id="email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" type="url" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} placeholder="https://" />
              </div>
            </div>
            <div className="space-y-3 rounded-xl border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Show a Call button</span>
                <Switch checked={contact.acceptsCalls} onCheckedChange={(v) => setContact({ ...contact, acceptsCalls: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Show a WhatsApp button</span>
                <Switch checked={contact.acceptsWhatsapp} onCheckedChange={(v) => setContact({ ...contact, acceptsWhatsapp: v })} />
              </label>
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

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate("/start") : setStep(step - 1))}>
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
