import { generateOtp, hashOtp, verifyOtpHash } from '@/modules/identity/security/otp';

describe('OTP Security', () => {
  it('generates 6-digit numeric string OTPs by default', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates OTP of specified custom length', () => {
    const otp = generateOtp(4);
    expect(otp).toMatch(/^\d{4}$/);
  });

  it('hashes OTP and verifies matching OTP correctly', () => {
    const otp = '987654';
    const hash = hashOtp(otp);

    expect(hash).toBeDefined();
    expect(verifyOtpHash(otp, hash)).toBe(true);
    expect(verifyOtpHash('123456', hash)).toBe(false);
  });
});
