import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from '@/modules/identity/security/password';

describe('Password Security', () => {
  describe('validatePasswordPolicy', () => {
    it('approves strong passwords that meet all criteria', () => {
      const result = validatePasswordPolicy('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = validatePasswordPolicy('P@1a');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must be at least 8 characters long');
    });

    it('rejects passwords missing uppercase letters', () => {
      const result = validatePasswordPolicy('lowercase1@');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one uppercase letter');
    });

    it('rejects passwords missing numbers', () => {
      const result = validatePasswordPolicy('NoNumbersHere@');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one number');
    });

    it('rejects passwords missing special characters', () => {
      const result = validatePasswordPolicy('NoSpecialChar123');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one special character');
    });
  });

  describe('hashPassword & verifyPassword', () => {
    it('hashes passwords using scrypt with unique salt', async () => {
      const raw = 'SecretP@ssword123';
      const hash1 = await hashPassword(raw);
      const hash2 = await hashPassword(raw);

      expect(hash1).toMatch(/^scrypt\$N=16384,r=8,p=1\$[0-9a-f]+\$[0-9a-f]+$/);
      // Different salts produce different hashes
      expect(hash1).not.toEqual(hash2);
    });

    it('correctly verifies valid password against hash', async () => {
      const raw = 'SecretP@ssword123';
      const hash = await hashPassword(raw);

      const isValid = await verifyPassword(raw, hash);
      expect(isValid).toBe(true);
    });

    it('rejects invalid password', async () => {
      const raw = 'SecretP@ssword123';
      const hash = await hashPassword(raw);

      const isValid = await verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });
  });
});
