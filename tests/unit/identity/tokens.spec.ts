import { generateRandomToken, hashToken } from '@/modules/identity/security/tokens';

describe('Tokens Security', () => {
  it('generates cryptographically random hex tokens', () => {
    const token1 = generateRandomToken(32);
    const token2 = generateRandomToken(32);

    expect(token1).toHaveLength(64); // 32 bytes in hex = 64 hex chars
    expect(token1).not.toEqual(token2);
  });

  it('computes deterministic SHA-256 hash of token', () => {
    const raw = 'my-super-secret-raw-token';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(raw);
  });
});
