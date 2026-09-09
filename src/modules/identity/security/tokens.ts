import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure random token string in hex format.
 */
export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Returns the SHA-256 hash of a token in hex format. Raw sensitive tokens
 * (session tokens, email verification tokens, password reset tokens) are
 * never stored in plaintext in the database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
