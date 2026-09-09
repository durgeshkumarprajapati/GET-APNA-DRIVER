// Deliberately minimal: validates that a phone number is already in E.164
// format (leading "+", country code, 8-15 digits total). It does not attempt
// locale-aware parsing of local-format numbers — collecting a country code
// and formatting to E.164 is the caller's responsibility (a future phase,
// alongside OTP delivery). Introduce a full phone-number library only if a
// concrete requirement (e.g. locale-aware input parsing) justifies it.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(value: string): string {
  return value.trim();
}

export function isValidE164PhoneNumber(value: string): boolean {
  return E164_REGEX.test(value);
}
