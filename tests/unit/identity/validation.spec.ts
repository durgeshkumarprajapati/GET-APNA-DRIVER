import { isValidEmail, normalizeEmail } from '@/modules/identity/validation/email';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '@/modules/identity/validation/phone';

describe('email validation', () => {
  it('normalizes to trimmed lowercase', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('accepts a well-formed email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it.each(['not-an-email', 'missing@domain', '@example.com', 'user@', ''])(
    'rejects %s',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

describe('phone validation', () => {
  it('accepts a well-formed E.164 number', () => {
    expect(isValidE164PhoneNumber('+919876543210')).toBe(true);
  });

  it.each(['9876543210', '00919876543210', '+0123456789', 'abc', '+91 98765 43210'])(
    'rejects %s',
    (value) => {
      expect(isValidE164PhoneNumber(value)).toBe(false);
    },
  );

  it('trims but does not otherwise alter input', () => {
    expect(normalizePhoneNumber('  +919876543210 ')).toBe('+919876543210');
  });
});
