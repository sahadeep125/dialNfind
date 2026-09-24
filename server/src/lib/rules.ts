import { z } from "zod";

/**
 * Field rules shared by every route, mirrored in the web and provider apps so the browser and the
 * API agree on what is valid.
 */

/** Indian phone numbers: 10-digit mobiles (6-9 first) or STD landlines, with or without +91 / 0. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  const national = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  if (/^[6-9]/.test(national)) return `+91${national}`;
  if (/^[1-5]/.test(national)) return `+91${national}`; // landline with STD code
  return null;
}

export const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid 10-digit Indian phone number" });
    return n ?? v;
  });

/** Empty string or null become null; anything else must be a valid phone. */
export const optionalPhone = z
  .union([z.literal(""), z.null(), phone])
  .transform((v) => (v ? v : null))
  .optional();

export const personName = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters")
  .max(80)
  .regex(/^[\p{L}][\p{L}\p{M} .'-]*$/u, "Use letters, spaces, dots, apostrophes or hyphens only");

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");

/** http(s) links only, so javascript: and data: URLs can never be stored. */
export const httpUrl = z
  .string()
  .trim()
  .url("Enter a valid link")
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), "Links must start with http:// or https://");

export const optionalUrl = z.union([z.literal(""), z.null(), httpUrl]).transform((v) => (v ? v : null));
