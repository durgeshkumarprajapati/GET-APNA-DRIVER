import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { generateRandomToken } from '@/modules/identity/security/tokens';
import { getGoogleAuthorizationUrl } from '@/modules/identity/infrastructure/oauth-provider';

export async function GET(): Promise<NextResponse> {
  const state = generateRandomToken(16);
  const authUrl = getGoogleAuthorizationUrl(state);

  const response = NextResponse.redirect(authUrl);

  try {
    const cookieStore = await cookies();
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });
  } catch {
    // Expected in non-request test contexts
  }

  return response;
}
