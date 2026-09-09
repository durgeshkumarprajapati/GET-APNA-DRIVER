import 'server-only';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Generates a cryptographically secure numeric OTP string of the specified length (default 6 digits).
 */
export function generateOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = randomInt(min, max + 1);
  return num.toString().padStart(length, '0');
}

/**
 * Computes SHA-256 hash of an OTP value.
 */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/**
 * Verifies a candidate OTP against a stored SHA-256 hash using timing-safe comparison.
 */
export function verifyOtpHash(otp: string, storedHash: string): boolean {
  const candidateHash = hashOtp(otp);
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');

  if (candidateBuf.length !== storedBuf.length) {
    return false;
  }

  return timingSafeEqual(candidateBuf, storedBuf);
}
