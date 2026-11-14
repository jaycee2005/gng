// Small helpers for reading and validating FormData in Server Actions (FR-019).

export class ValidationError extends Error {}

export function text(
  form: FormData,
  key: string,
  opts: { required?: boolean; max?: number; label?: string } = {}
): string {
  const value = String(form.get(key) ?? "").trim();
  const label = opts.label ?? key;
  if (opts.required && !value) throw new ValidationError(`${label} is required.`);
  if (opts.max && value.length > opts.max)
    throw new ValidationError(`${label} must be at most ${opts.max} characters.`);
  return value;
}

export function oneOf<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
  label = key
): T {
  const value = String(form.get(key) ?? "");
  if (!allowed.includes(value as T)) throw new ValidationError(`Choose a valid ${label}.`);
  return value as T;
}

export function optionalDate(form: FormData, key: string, label = key): Date | null {
  const value = String(form.get(key) ?? "").trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} is not a valid date.`);
  return date;
}

export function intInRange(form: FormData, key: string, min: number, max: number, label = key) {
  const n = Number(form.get(key));
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ValidationError(`${label} must be a whole number between ${min} and ${max}.`);
  return n;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function email(form: FormData, key = "email") {
  const value = text(form, key, { required: true, max: 254, label: "Email" }).toLowerCase();
  if (!EMAIL_RE.test(value)) throw new ValidationError("Enter a valid email address.");
  return value;
}

const E164_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes Philippine and international mobile numbers to E.164 format.
 * Examples:
 *   "09171234567"   -> "+639171234567" (Philippine local 11-digit mobile)
 *   "9171234567"    -> "+639171234567" (Philippine 10-digit mobile starting with 9)
 *   "639171234567"  -> "+639171234567" (Philippine 12-digit with country code)
 *   "+639171234567" -> "+639171234567" (E.164)
 *   "+15555550100"  -> "+15555550100"  (International E.164)
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;

  let candidate: string;
  if (trimmed.startsWith("+")) {
    candidate = `+${digits}`;
  } else if (digits.length === 11 && digits.startsWith("09")) {
    // Philippine local mobile format: 09XXXXXXXXX -> +639XXXXXXXXX
    candidate = `+63${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("9")) {
    // Philippine 10-digit mobile without leading 0: 9XXXXXXXXX -> +639XXXXXXXXX
    candidate = `+63${digits}`;
  } else if (digits.length === 12 && digits.startsWith("639")) {
    // Philippine 12-digit with 63 prefix: 639XXXXXXXXX -> +639XXXXXXXXX
    candidate = `+${digits}`;
  } else if (digits.length === 10) {
    // Fallback for 10-digit North American numbers in demo seed data
    candidate = `+1${digits}`;
  } else {
    candidate = `+${digits}`;
  }

  return E164_RE.test(candidate) ? candidate : null;
}

export function isValidPhone(phone: string | null | undefined): phone is string {
  return !!phone && E164_RE.test(phone);
}

export function phone(form: FormData, key = "phone", required = false) {
  const raw = text(form, key, { required, label: "Phone number" });
  if (!raw) return null;
  const normalized = normalizePhone(raw);
  if (!normalized)
    throw new ValidationError(
      "Enter a valid mobile number (e.g. 09171234567 or +639171234567)."
    );
  return normalized;
}

export function password(form: FormData, key = "password") {
  const value = String(form.get(key) ?? "");
  if (value.length < 8) throw new ValidationError("Password must be at least 8 characters.");
  if (value.length > 128) throw new ValidationError("Password is too long.");
  return value;
}

/** Comma-separated list -> trimmed unique array (used for skills). */
export function list(form: FormData, key: string, maxItems = 30): string[] {
  const raw = String(form.get(key) ?? "");
  const items = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  if (items.length > maxItems) throw new ValidationError(`Enter at most ${maxItems} items.`);
  return items.map((s) => s.slice(0, 60));
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function maskPhone(phone: string) {
  if (!phone.startsWith("+")) return "—";
  return `${phone.slice(0, 4)}••••${phone.slice(-2)}`;
}
