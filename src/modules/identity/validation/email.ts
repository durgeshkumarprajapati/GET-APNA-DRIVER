// Deliberately minimal: this is a shape check, not full RFC 5322 validation.
// True deliverability is confirmed later by the (not-yet-implemented) email
// verification flow.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(value);
}
