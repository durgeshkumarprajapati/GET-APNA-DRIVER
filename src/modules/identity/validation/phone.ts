// Deliberately minimal: validates that a phone number is already in E.164
// format (leading "+", country code, 8-15 digits total). It does not attempt
// locale-aware parsing of local-format numbers — collecting a country code
// and formatting to E.164 is the caller's responsibility (a future phase,
// alongside OTP delivery). Introduce a full phone-number library only if a
// concrete requirement (e.g. locale-aware input parsing) justifies it.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE_REGEX = /^\+91[6-9]\d{9}$/;

export function normalizePhoneNumber(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // If starts with '+', clean digits after '+'
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  const digits = trimmed.replace(/\D/g, '');

  // 10-digit Indian mobile number starting with 6-9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return '+91' + digits;
  }

  // 12-digit number starting with 91 (e.g. 916261549133)
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+' + digits;
  }

  return digits;
}

export function isValidE164PhoneNumber(value: string): boolean {
  if (!E164_REGEX.test(value)) {
    return false;
  }
  // If it's an Indian number (+91...), enforce Indian 10-digit mobile rule
  if (value.startsWith('+91')) {
    return INDIAN_MOBILE_REGEX.test(value);
  }
  return true;
}
