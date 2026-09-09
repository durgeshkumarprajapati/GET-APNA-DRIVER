import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16,
};

/**
 * Server-side password policy requirements.
 */
export interface PasswordPolicyResult {
  isValid: boolean;
  issues: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const issues: string[] = [];

  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    issues.push('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('Password must contain at least one special character');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Securely hashes a password using Node.js scrypt with unique per-user salt.
 * Formatted as: `scrypt$N=16384,r=8,p=1$<saltHex>$<derivedKeyHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_PARAMS.saltLen);
  const derivedKey = scryptSync(password, salt, SCRYPT_PARAMS.keyLen, {
    cost: SCRYPT_PARAMS.N,
    blockSize: SCRYPT_PARAMS.r,
    parallelization: SCRYPT_PARAMS.p,
  });

  const header = `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}`;
  return `${header}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a candidate password against a stored scrypt hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    if (parts.length < 4 || parts[0] !== 'scrypt') {
      return false;
    }

    const paramPairs = parts[1].split(',');
    const params: Record<string, number> = {};
    for (const pair of paramPairs) {
      const [k, v] = pair.split('=');
      params[k] = parseInt(v, 10);
    }

    const salt = Buffer.from(parts[2], 'hex');
    const expectedDerivedKey = Buffer.from(parts[3], 'hex');

    const actualDerivedKey = scryptSync(password, salt, expectedDerivedKey.length, {
      cost: params.N || SCRYPT_PARAMS.N,
      blockSize: params.r || SCRYPT_PARAMS.r,
      parallelization: params.p || SCRYPT_PARAMS.p,
    });

    if (actualDerivedKey.length !== expectedDerivedKey.length) {
      return false;
    }

    return timingSafeEqual(actualDerivedKey, expectedDerivedKey);
  } catch {
    return false;
  }
}
