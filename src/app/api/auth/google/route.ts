import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { generateRandomToken } from '@/modules/identity/security/tokens';
import { getGoogleAuthorizationUrl } from '@/modules/identity/infrastructure/oauth-provider';
import { GoogleOAuthNotConfiguredError } from '@/modules/identity/domain/errors';
import { logger } from '@/shared/logging/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const state = generateRandomToken(16);

  let authUrl: string;
  try {
    authUrl = getGoogleAuthorizationUrl(state);
  } catch (error: unknown) {
    if (error instanceof GoogleOAuthNotConfiguredError) {
      logger.warn({ err: error.code }, 'Google OAuth initiation rejected: not configured');
      return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }
    throw error;
  }

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
