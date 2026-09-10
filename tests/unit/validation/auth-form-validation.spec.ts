import {
  isValidEmailFormat,
  isValidIndianMobile,
  isValidReferralCodeFormat,
  validateRegistrationForm,
  type RegistrationFormInput,
} from '@/shared/validation/auth-form-validation';

describe('isValidIndianMobile', () => {
  it('accepts a valid 10-digit mobile number starting with 6-9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('6000000000')).toBe(true);
  });

  it('rejects a number starting with 0-5', () => {
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });

  it('rejects too short or too long numbers', () => {
    expect(isValidIndianMobile('987654321')).toBe(false);
    expect(isValidIndianMobile('98765432100')).toBe(false);
  });

  it('rejects letters and empty input', () => {
    expect(isValidIndianMobile('98765abcde')).toBe(false);
    expect(isValidIndianMobile('')).toBe(false);
  });

  it('ignores spaces and a +91 prefix when checking the underlying digits', () => {
    expect(isValidIndianMobile('98765 43210')).toBe(true);
    expect(isValidIndianMobile('+91 98765 43210')).toBe(false); // +91 adds an 11th/12th digit
  });
});

describe('isValidEmailFormat', () => {
  it('accepts a normal email address', () => {
    expect(isValidEmailFormat('user@example.com')).toBe(true);
  });

  it('rejects a string with no @ or no domain', () => {
    expect(isValidEmailFormat('not-an-email')).toBe(false);
    expect(isValidEmailFormat('user@')).toBe(false);
  });
});

describe('isValidReferralCodeFormat', () => {
  it('accepts alphanumeric codes with hyphens, 3-20 characters', () => {
    expect(isValidReferralCodeFormat('REF-2026')).toBe(true);
    expect(isValidReferralCodeFormat('abc')).toBe(true);
  });

  it('rejects codes that are too short, too long, or contain invalid characters', () => {
    expect(isValidReferralCodeFormat('ab')).toBe(false);
    expect(isValidReferralCodeFormat('a'.repeat(21))).toBe(false);
    expect(isValidReferralCodeFormat('REF CODE!')).toBe(false);
  });
});

describe('validateRegistrationForm', () => {
  function validInput(overrides: Partial<RegistrationFormInput> = {}): RegistrationFormInput {
    return {
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'asha@example.com',
      phone: '9876543210',
      password: 'ValidP@ssword123',
      referralCode: '',
      termsAgreed: true,
      ...overrides,
    };
  }

  it('accepts a fully valid form', () => {
    expect(validateRegistrationForm(validInput())).toBeNull();
  });

  it('rejects a missing first or last name', () => {
    expect(validateRegistrationForm(validInput({ firstName: '' }))).toMatch(/name/i);
    expect(validateRegistrationForm(validInput({ lastName: '  ' }))).toMatch(/name/i);
  });

  it('rejects an invalid email', () => {
    expect(validateRegistrationForm(validInput({ email: 'not-an-email' }))).toMatch(/email/i);
  });

  it('rejects an invalid phone number when one is provided', () => {
    expect(validateRegistrationForm(validInput({ phone: '123' }))).toMatch(/mobile number/i);
  });

  it('allows an empty phone number (optional field)', () => {
    expect(validateRegistrationForm(validInput({ phone: '' }))).toBeNull();
  });

  it('rejects a password under 8 characters', () => {
    expect(validateRegistrationForm(validInput({ password: 'short' }))).toMatch(/password/i);
  });

  it('rejects a malformed referral code when one is provided', () => {
    expect(validateRegistrationForm(validInput({ referralCode: '!!' }))).toMatch(/referral/i);
  });

  it('allows an empty referral code (optional field)', () => {
    expect(validateRegistrationForm(validInput({ referralCode: '' }))).toBeNull();
  });

  it('rejects when terms have not been agreed to', () => {
    expect(validateRegistrationForm(validInput({ termsAgreed: false }))).toMatch(/charter/i);
  });
});
