/**
 * Pure, framework-free client-side validation helpers for the
 * login/register forms — for immediate UX feedback only. The server (zod
 * schemas + auth-service.ts) remains the sole authoritative validator;
 * nothing here is ever trusted as a substitute for it.
 *
 * Extracted out of login/page.tsx and register/page.tsx, which previously
 * each had their own slightly-different inline 10-digit-mobile regex.
 */

/** A bare 10-digit Indian mobile number (no +91 prefix, no spaces). */
export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));
}

export function isValidEmailFormat(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

/** Matches the shape referral codes are generated in (see referral-service.ts) — not a guarantee the code exists. */
export function isValidReferralCodeFormat(value: string): boolean {
  return /^[A-Z0-9-]{3,20}$/i.test(value.trim());
}

export interface RegistrationFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode: string;
  termsAgreed: boolean;
}

/** Returns the first validation problem found, or null if the form is ready to submit. */
export function validateRegistrationForm(input: RegistrationFormInput): string | null {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return 'Please enter your first and last name.';
  }
  if (!isValidEmailFormat(input.email)) {
    return 'Please enter a valid email address.';
  }
  if (input.phone.trim() && !isValidIndianMobile(input.phone)) {
    return 'Please enter a valid 10-digit Indian mobile number.';
  }
  if (input.password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (input.referralCode.trim() && !isValidReferralCodeFormat(input.referralCode)) {
    return 'Referral codes are 3-20 letters, numbers, or hyphens.';
  }
  if (!input.termsAgreed) {
    return 'Please accept the Statutory Clearance & Safety Charter to proceed.';
  }
  return null;
}
