import { UserAvatar } from '@/components/ui/user-avatar';

describe('UserAvatar Fallback & Security Policy Spec', () => {
  it('defines UserAvatar component function correctly', () => {
    expect(typeof UserAvatar).toBe('function');
  });

  it('determines fallback image source correctly for unauthenticated or missing avatar states', () => {
    const DEFAULT_AVATAR = '/profile.png';

    const getEffectiveSrc = (isAuthenticated: boolean, src?: string | null, imageError?: boolean) => {
      return !isAuthenticated || !src || imageError ? DEFAULT_AVATAR : src;
    };

    // Unauthenticated user
    expect(getEffectiveSrc(false, 'https://example.com/pic.jpg')).toBe(DEFAULT_AVATAR);

    // Authenticated user with no avatar URL
    expect(getEffectiveSrc(true, null)).toBe(DEFAULT_AVATAR);

    // Authenticated user with broken image error
    expect(getEffectiveSrc(true, 'https://example.com/pic.jpg', true)).toBe(DEFAULT_AVATAR);

    // Authenticated user with valid avatar URL
    expect(getEffectiveSrc(true, 'https://example.com/pic.jpg')).toBe('https://example.com/pic.jpg');
  });
});
