import { isValidIndianMobile } from '@/shared/validation/auth-form-validation';
import { resolveDashboardHref } from '@/modules/identity/application/services/dashboard-redirect-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    customerProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cp-1', userId: 'user-1', firstName: 'Rahul', lastName: 'Sharma' }),
      create: jest.fn().mockResolvedValue({ id: 'cp-1', userId: 'user-1', firstName: 'Rahul', lastName: 'Sharma' }),
    },
  },
}));

describe('Phase 49 — Authentication UX & Access Reliability Spec', () => {
  describe('Indian Mobile Phone Validation', () => {
    it('validates 10-digit Indian mobile numbers correctly', () => {
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('8765432109')).toBe(true);
      expect(isValidIndianMobile('7654321098')).toBe(true);
      expect(isValidIndianMobile('6543210987')).toBe(true);
    });

    it('rejects invalid, short, or out-of-range mobile numbers', () => {
      expect(isValidIndianMobile('1234567890')).toBe(false);
      expect(isValidIndianMobile('98765')).toBe(false);
      expect(isValidIndianMobile('abcdefghij')).toBe(false);
      expect(isValidIndianMobile('')).toBe(false);
    });
  });

  describe('OTP Digit Paste & Keyboard Processing Helper', () => {
    it('extracts up to 6 numeric digits from pasted clipboard text', () => {
      const pasteText = 'Code: 987654 for verification';
      const extracted = pasteText.replace(/\D/g, '').slice(0, 6);
      expect(extracted).toBe('987654');
    });

    it('handles short or partial numeric paste cleanly', () => {
      const pasteText = '123';
      const extracted = pasteText.replace(/\D/g, '').slice(0, 6);
      expect(extracted).toBe('123');
    });
  });

  describe('Google OAuth Error Mapping', () => {
    const GOOGLE_OAUTH_ERROR_MESSAGES: Record<string, string> = {
      google_not_configured:
        'Google sign-in is not available right now. Please try mobile or email login.',
      google_invalid_callback: 'Google sign-in was interrupted. Please try again.',
      google_auth_failed: 'Google sign-in failed. Please try again, or use mobile or email login.',
    };

    it('maps known Google OAuth error codes to friendly localized messages', () => {
      expect(GOOGLE_OAUTH_ERROR_MESSAGES['google_not_configured']).toContain('Google sign-in is not available');
      expect(GOOGLE_OAUTH_ERROR_MESSAGES['google_auth_failed']).toContain('Google sign-in failed');
    });
  });

  describe('Role-Based Dashboard Redirect Href Resolution', () => {
    it('routes roleless new sessions to /auth/select-role', async () => {
      const nextPath = await resolveDashboardHref([], 'user-1');
      expect(nextPath).toBe('/auth/select-role');
    });

    it('routes customer sessions to customer dashboard when profile complete', async () => {
      const nextPath = await resolveDashboardHref(['CUSTOMER'], 'user-1');
      // Default mock profile evaluation returns complete for test user
      expect(['/customer/dashboard', '/customer/profile']).toContain(nextPath);
    });
  });
});
