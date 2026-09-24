import { z } from "zod";

/** Field rules shared with the API (server/src/lib/rules.ts), so both sides agree on what is valid. */

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  const national = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  if (national.length !== 10 || !/^[1-9]/.test(national)) return null;
  return `+91${national}`;
}

export const phone = z
  .string()
  .trim()
  .min(1, "Enter a phone number")
  .refine((v) => normalizePhone(v) !== null, "Enter a valid 10-digit Indian phone number");

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || normalizePhone(v) !== null, "Enter a valid 10-digit Indian phone number");

export const personName = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters")
  .max(80, "Keep it under 80 characters")
  .regex(/^[\p{L}][\p{L}\p{M} .'-]*$/u, "Use letters, spaces, dots, apostrophes or hyphens only");

export const email = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address").max(254);
export const optionalEmail = z.string().trim().refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address");

export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100, "Keep it under 100 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");
export const optionalPincode = z.string().trim().refine((v) => v === "" || /^[1-9]\d{5}$/.test(v), "Enter a valid 6-digit PIN code");

export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || (/^https?:\/\//i.test(v) && z.string().url().safeParse(v).success), "Enter a full link starting with https://");

/** Numeric text input that may be empty; returns a refine-able string. */
export const optionalInt = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), `${label} must be a whole number from ${min} to ${max.toLocaleString("en-IN")}`);

export const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
