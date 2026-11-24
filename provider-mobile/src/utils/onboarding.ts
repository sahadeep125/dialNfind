// Defaults, option lists and per-step validation for the new-listing wizard. The rules match the
// provider web app (src/pages/onboarding.tsx, components/editors.tsx) and the API's zod schemas.

import type { Hours, PriceUnit, SelectOption, ServiceArea } from "@/types";
import type {
  BusinessDraft,
  ContactDraft,
  LocationDraft,
  OnboardingDraft,
  OnboardingPayload,
  ServiceDraft,
  StepErrors,
} from "@/types/onboarding";
import { normalizePhone, validateEmail } from "@/utils/validation";

export const ONBOARDING_STEPS = [
  "Account type",
  "About",
  "Services",
  "Location",
  "Hours",
  "Contact",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** A first listing asks for the account type; another profession is always an individual's. */
export function stepsFor(adding: boolean): readonly OnboardingStep[] {
  return adding ? ONBOARDING_STEPS.slice(1) : ONBOARDING_STEPS;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Monday first, the way people read a week of opening hours. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const PRICE_UNIT_OPTIONS: SelectOption<PriceUnit>[] = [
  { value: "per_visit", label: "Per visit" },
  { value: "per_hour", label: "Per hour" },
  { value: "fixed", label: "Fixed / starting" },
];

export const RADIUS_OPTIONS = [2, 5, 10, 15, 20, 30, 50];

export const MAX_PRICE = 1_000_000;
export const MAX_AREAS = 50;

function timeLabel(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Every half hour of the day as HH:MM (24 hour), which is what the API stores. */
export const TIME_OPTIONS: SelectOption<string>[] = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
  return { value, label: timeLabel(value) };
});

export const DEFAULT_HOURS: Hours[] = DAY_NAMES.map((_, d) => ({
  dayOfWeek: d,
  openTime: d === 0 ? null : "09:00",
  closeTime: d === 0 ? null : "20:00",
  is24x7: false,
}));

export function initialDraft(
  user: { phone: string | null; email: string; name?: string } | null,
): OnboardingDraft {
  return {
    business: {
      businessName: user?.name ?? "",
      businessType: "individual",
      professionKey: "",
      profession: "",
      yearsExperience: "",
      description: "",
      logoUrl: null,
      coverUrl: null,
    },
    services: [],
    location: {
      addressLine: "",
      locality: "",
      city: "Siliguri",
      state: "West Bengal",
      pincode: "",
      latitude: 26.7271,
      longitude: 88.3953,
      serviceRadiusKm: 10,
    },
    areas: [],
    hours: DEFAULT_HOURS,
    contact: {
      phone: user?.phone ?? "",
      whatsappNumber: "",
      email: user?.email ?? "",
      website: "",
      acceptsCalls: true,
      acceptsWhatsapp: true,
    },
  };
}

export function validateBusiness(b: BusinessDraft): StepErrors {
  const errors: StepErrors = {};
  const individual = b.businessType === "individual";
  const name = b.businessName.trim();
  if (name.length < 2) errors.businessName = individual ? "Enter your full name" : "Enter your business name";
  else if (name.length > 100) errors.businessName = "Keep the name under 100 characters";
  const years = b.yearsExperience.trim();
  if (years && (!/^\d+$/.test(years) || Number(years) > 80))
    errors.yearsExperience = "Years of experience must be a whole number from 0 to 80";
  if (b.description.trim().length > 2000)
    errors.description = "Keep the description under 2,000 characters";
  if (individual && !b.professionKey) errors.professionKey = "Pick your profession";
  if (individual && b.profession.trim().length > 80)
    errors.profession = "Keep the title under 80 characters";
  return errors;
}

export function priceError(price: number | null): string | null {
  if (price === null) return null;
  if (!Number.isFinite(price) || price < 0) return "Enter a price of 0 or more";
  if (!Number.isInteger(price)) return "Use whole rupees";
  if (price > MAX_PRICE) return "Keep the price under Rs 10,00,000";
  return null;
}

export function validateServices(services: ServiceDraft[], individual = false): StepErrors {
  if (services.length === 0) return { services: "Pick at least one service" };
  if (services.some((s) => priceError(s.startingPrice)))
    return { services: "Fix the highlighted starting prices" };
  if (individual && new Set(services.map((s) => s.categoryId)).size > 1)
    return {
      services: "This listing is for one profession. Add other professions as separate listings later.",
    };
  return {};
}

export function validateLocation(l: LocationDraft): StepErrors {
  const errors: StepErrors = {};
  if (l.addressLine.trim().length > 200)
    errors.addressLine = "Keep the address under 200 characters";
  if (l.locality.trim().length > 80) errors.locality = "Keep the locality under 80 characters";
  if (l.city.trim().length < 2) errors.city = "Enter your city";
  else if (l.city.trim().length > 60) errors.city = "Keep the city under 60 characters";
  if (l.state.trim().length < 2) errors.state = "Enter your state";
  else if (l.state.trim().length > 60) errors.state = "Keep the state under 60 characters";
  if (l.pincode.trim() && !/^[1-9]\d{5}$/.test(l.pincode.trim()))
    errors.pincode = "Enter a valid 6-digit PIN code";
  return errors;
}

/** Problems keyed by day of week, empty when every open day has a valid range. */
export function validateHours(hours: Hours[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const h of hours) {
    if (h.is24x7) continue;
    if (!h.openTime !== !h.closeTime) errors[h.dayOfWeek] = "Set both opening and closing times";
    else if (h.openTime && h.closeTime && h.closeTime <= h.openTime)
      errors[h.dayOfWeek] = "Closing time must be after opening time";
  }
  return errors;
}

function validateUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.length > 500) return "Keep the link under 500 characters";
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v)
    ? null
    : "Enter a full link starting with https://";
}

export function validateContact(c: ContactDraft): StepErrors {
  const errors: StepErrors = {};
  if (!c.phone.trim()) errors.phone = "Enter a phone number";
  else if (!normalizePhone(c.phone)) errors.phone = "Enter a valid 10-digit Indian phone number";
  if (c.whatsappNumber.trim() && !normalizePhone(c.whatsappNumber))
    errors.whatsappNumber = "Enter a valid 10-digit Indian phone number";
  if (c.email.trim()) {
    const emailError = validateEmail(c.email);
    if (emailError) errors.email = emailError;
  }
  const urlError = validateUrl(c.website);
  if (urlError) errors.website = urlError;
  if (!c.acceptsCalls && !c.acceptsWhatsapp)
    errors.acceptsCalls = "Turn on at least one way for customers to reach you";
  return errors;
}

/** Checks one step of the wizard and returns its problems (empty when it can move on). */
export function validateStep(step: OnboardingStep, draft: OnboardingDraft): StepErrors {
  if (step === "Account type") return {};
  if (step === "About") return validateBusiness(draft.business);
  if (step === "Services")
    return validateServices(draft.services, draft.business.businessType === "individual");
  if (step === "Location") return validateLocation(draft.location);
  if (step === "Hours")
    return Object.keys(validateHours(draft.hours)).length
      ? { hours: "Fix the highlighted days" }
      : {};
  return validateContact(draft.contact);
}

/**
 * Picking a profession makes it the listing's main service. Other services of the same category stay,
 * so going back to change "AC Technician" to "Refrigerator Repair Technician" keeps the rest.
 */
export function servicesForProfession(
  services: ServiceDraft[],
  p: { categoryId: number; subcategoryId: number | null },
): ServiceDraft[] {
  const keep = services
    .filter((s) => s.categoryId === p.categoryId && s.subcategoryId !== p.subcategoryId)
    .map((s) => ({ ...s, isPrimary: false }));
  return [
    { categoryId: p.categoryId, subcategoryId: p.subcategoryId, startingPrice: null, priceUnit: "per_visit", isPrimary: true },
    ...keep,
  ];
}

/** Switching to an individual keeps only the picked profession's category. */
export function servicesForType(
  services: ServiceDraft[],
  type: BusinessDraft["businessType"],
  professionCategoryId: number | null,
): ServiceDraft[] {
  if (type !== "individual" || professionCategoryId === null) return services;
  const kept = services.filter((s) => s.categoryId === professionCategoryId);
  if (kept.length && !kept.some((s) => s.isPrimary)) kept[0] = { ...kept[0], isPrimary: true };
  return kept;
}

/** Adds a service area, or returns why it cannot be added. */
export function areaError(areas: ServiceArea[], name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return "Enter at least 2 characters";
  if (n.length > 80) return "Keep the area name under 80 characters";
  if (areas.some((a) => a.areaName.toLowerCase() === n.toLowerCase()))
    return `${n} is already in your list`;
  if (areas.length >= MAX_AREAS) return `You can list up to ${MAX_AREAS} areas`;
  return null;
}

/** Turns the wizard's form state into the body POST /provider/onboarding expects. */
export function toPayload(draft: OnboardingDraft): OnboardingPayload {
  const { business, location, contact } = draft;
  const phone = normalizePhone(contact.phone) ?? contact.phone.trim();
  return {
    businessName: business.businessName.trim(),
    businessType: business.businessType,
    profession: business.businessType === "individual" ? business.profession.trim() || null : null,
    yearsExperience: business.yearsExperience.trim() ? Number(business.yearsExperience) : null,
    description: business.description.trim() || undefined,
    phone,
    whatsappNumber: contact.whatsappNumber.trim() ? normalizePhone(contact.whatsappNumber) : phone,
    email: contact.email.trim().toLowerCase(),
    website: contact.website.trim(),
    addressLine: location.addressLine.trim() || undefined,
    locality: location.locality.trim() || undefined,
    city: location.city.trim(),
    state: location.state.trim(),
    pincode: location.pincode.trim() || undefined,
    latitude: location.latitude,
    longitude: location.longitude,
    serviceRadiusKm: location.serviceRadiusKm,
    acceptsCalls: contact.acceptsCalls,
    acceptsWhatsapp: contact.acceptsWhatsapp,
    services: draft.services.map(
      ({ categoryId, subcategoryId, startingPrice, priceUnit, isPrimary }) => ({
        categoryId,
        subcategoryId,
        startingPrice,
        priceUnit,
        isPrimary,
      }),
    ),
    serviceAreas: draft.areas,
    hours: draft.hours,
  };
}
