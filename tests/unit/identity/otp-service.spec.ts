import { generateOtp, hashOtp, verifyOtpHash } from '@/modules/identity/security/otp';
import { normalizePhoneNumber, isValidE164PhoneNumber } from '@/modules/identity/validation/phone';

describe('OTP Security & Phone Validation', () => {
  describe('OTP Generation and Hashing', () => {
    it('generates 6-digit numeric string OTPs by default', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('generates OTP of specified custom length', () => {
      const otp = generateOtp(4);
      expect(otp).toMatch(/^\d{4}$/);
    });

    it('hashes OTP using SHA-256 and verifies matching OTP timing-safely', () => {
      const otp = '987654';
      const hash = hashOtp(otp);

      expect(hash).toBeDefined();
      expect(verifyOtpHash(otp, hash)).toBe(true);
      expect(verifyOtpHash('123456', hash)).toBe(false);
    });
  });

  describe('Indian Mobile Number Normalization & Validation', () => {
    it('validates standard Indian mobile number (+919876543210)', () => {
      const phone = '+919876543210';
      const normalized = normalizePhoneNumber(phone);
      expect(normalized).toBe('+919876543210');
      expect(isValidE164PhoneNumber(normalized)).toBe(true);
    });

    it('strips dashes and whitespace from E.164 phone number', () => {
      const normalized = normalizePhoneNumber('+91 98765-43210');
      expect(normalized).toBe('+919876543210');
      expect(isValidE164PhoneNumber(normalized)).toBe(true);
    });

    it('rejects invalid numbers without leading plus or invalid prefix', () => {
      expect(isValidE164PhoneNumber('9876543210')).toBe(false);
      expect(isValidE164PhoneNumber('+911234567890')).toBe(false);
      expect(isValidE164PhoneNumber('+9198765')).toBe(false);
    });
  });
});
