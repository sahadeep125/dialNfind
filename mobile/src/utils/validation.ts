// Field rules shared with the API (server/src/lib/rules.ts). Each returns an error message, or null when valid.

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  const national =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  if (national.length !== 10 || !/^[1-9]/.test(national)) return null;
  return `+91${national}`;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address";
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return "Enter a valid email address";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Enter a password";
  if (value.length < 8) return "Use at least 8 characters";
  if (value.length > 100) return "Keep it under 100 characters";
  if (!/[A-Za-z]/.test(value)) return "Include at least one letter";
  if (!/\d/.test(value)) return "Include at least one number";
  return null;
}

export function validateName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return "Enter at least 2 characters";
  if (v.length > 80) return "Keep it under 80 characters";
  if (!/^[\p{L}][\p{L}\p{M} .'-]*$/u.test(v))
    return "Use letters, spaces, dots, apostrophes or hyphens only";
  return null;
}

export function validateOptionalPhone(value: string): string | null {
  if (!value.trim()) return null;
  return normalizePhone(value) ? null : "Enter a valid 10-digit Indian phone number";
}

/** minLength comes from the admin settings (GET /app-config); 10 until it has loaded. */
export function validateReviewText(value: string, minLength = 10): string | null {
  const v = value.trim();
  if (!v) return "Write a few words about your experience";
  if (v.length < minLength) return `Tell others a little more (at least ${minLength} characters)`;
  if (v.length > 2000) return "Keep it under 2,000 characters";
  return null;
}

/** True when every value in an errors object is empty. */
export function isValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => !e);
}
