// Pure helpers for the business profile editor: load, validate and build the PATCH body.
// Rules match server/src/routes/provider/profile.ts and the web app's profile schema.

import type { ProviderProfile } from "@/types";
import type { ProfileFormErrors, ProfileFormValues, ProfileUpdateBody } from "@/types/listing";
import { normalizePhone, validateEmail, validateOptionalPhone } from "@/utils/validation";

export const DESCRIPTION_MAX = 2000;
export const DESCRIPTION_GOOD = 80;

export function toFormValues(p: ProviderProfile): ProfileFormValues {
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
    logoUrl: p.logoUrl,
    coverUrl: p.coverUrl,
    acceptsCalls: p.acceptsCalls,
    acceptsWhatsapp: p.acceptsWhatsapp,
    addressLine: p.addressLine ?? "",
    locality: p.locality ?? "",
    city: p.city,
    state: p.state,
    pincode: p.pincode ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

function intError(value: string, max: number, label: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\d+$/.test(v)) return `${label} must be a whole number`;
  if (Number(v) > max) return `${label} must be ${max.toLocaleString("en-IN")} or less`;
  return null;
}

function urlError(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v)) return "Enter a full link starting with https://";
  if (v.length > 500) return "Keep the link under 500 characters";
  return null;
}

function maxError(value: string, max: number, what: string): string | null {
  return value.trim().length > max ? `Keep the ${what} under ${max} characters` : null;
}

export function validateProfile(v: ProfileFormValues): ProfileFormErrors {
  const name = v.businessName.trim();
  return {
    businessName:
      name.length < 2
        ? "Enter your business name"
        : name.length > 100
          ? "Keep it under 100 characters"
          : null,
    description: maxError(v.description, DESCRIPTION_MAX, "description"),
    yearsExperience: intError(v.yearsExperience, 80, "Years in business"),
    selfReportedCompletedJobs: intError(v.selfReportedCompletedJobs, 1_000_000, "Jobs completed"),
    phone: normalizePhone(v.phone) ? null : "Enter a valid 10-digit Indian phone number",
    whatsappNumber: validateOptionalPhone(v.whatsappNumber),
    email: v.email.trim() ? validateEmail(v.email) : null,
    website: urlError(v.website),
    acceptsCalls:
      v.acceptsCalls || v.acceptsWhatsapp
        ? null
        : "Keep at least one way for customers to reach you",
    addressLine: maxError(v.addressLine, 200, "address"),
    locality: maxError(v.locality, 80, "locality"),
    city: v.city.trim().length < 2 ? "Enter your city" : maxError(v.city, 60, "city"),
    state: v.state.trim().length < 2 ? "Enter your state" : maxError(v.state, 60, "state"),
    pincode:
      v.pincode.trim() && !/^[1-9]\d{5}$/.test(v.pincode.trim())
        ? "Enter a valid 6-digit PIN code"
        : null,
  };
}

const orNull = (v: string): string | null => v.trim() || null;

export function toProfileBody(v: ProfileFormValues): ProfileUpdateBody {
  return {
    businessName: v.businessName.trim(),
    businessType: v.businessType,
    description: orNull(v.description),
    yearsExperience: v.yearsExperience.trim() ? Number(v.yearsExperience) : null,
    selfReportedCompletedJobs: v.selfReportedCompletedJobs.trim()
      ? Number(v.selfReportedCompletedJobs)
      : null,
    phone: normalizePhone(v.phone) ?? v.phone.trim(),
    whatsappNumber: v.whatsappNumber.trim() ? normalizePhone(v.whatsappNumber) : null,
    email: v.email.trim() || null,
    website: v.website.trim() || null,
    logoUrl: v.logoUrl,
    coverUrl: v.coverUrl,
    acceptsCalls: v.acceptsCalls,
    acceptsWhatsapp: v.acceptsWhatsapp,
    addressLine: orNull(v.addressLine),
    locality: orNull(v.locality),
    city: v.city.trim(),
    state: v.state.trim(),
    pincode: orNull(v.pincode),
    latitude: v.latitude,
    longitude: v.longitude,
  };
}

export function sameValues(a: ProfileFormValues, b: ProfileFormValues): boolean {
  return (Object.keys(a) as (keyof ProfileFormValues)[]).every((k) => a[k] === b[k]);
}
