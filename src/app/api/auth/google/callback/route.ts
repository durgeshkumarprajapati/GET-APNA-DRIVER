import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';
import { AppError } from '@/shared/errors/app-error';
import { GoogleOAuthStateMismatchError } from '@/modules/identity/domain/errors';
import { handleGoogleOAuthCallback } from '@/modules/identity/application/services/auth-service';

/** Short-lived, httpOnly carrier for a brand-new identity's Google name/avatar until role selection reads and clears it — same pattern/TTL discipline as the `oauth_state` cookie above it. Never contains the Google subject, email, or any token. */
const PENDING_PROFILE_COOKIE = 'oauth_pending_profile';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  try {
    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=google_invalid_callback', req.url));
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get('oauth_state')?.value;
    cookieStore.delete('oauth_state');
    // Require the cookie to exist AND match — a missing cookie (expired,
    // never set, or a forged callback hit directly without ever visiting
    // /api/auth/google first) must fail closed, not be silently skipped.
    if (!savedState || savedState !== state) {
      throw new GoogleOAuthStateMismatchError();
    }

    const result = await handleGoogleOAuthCallback(code, { ipAddress: ip, userAgent });

    if (result.isNewIdentity && result.profileHint) {
      cookieStore.set(PENDING_PROFILE_COOKIE, JSON.stringify(result.profileHint), {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60, // 10 minutes — long enough to complete role selection, short enough to not linger
      });
    }

    // Always redirect to `/` and let the existing server-side, role-aware
    // redirect (src/app/page.tsx → dashboard-redirect-service.ts →
    // profile-completion-service.ts) decide the destination — including
    // sending a roleless brand-new identity to /auth/select-role. No
    // special-casing needed here.
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error: unknown) {
    const errorCode = error instanceof AppError ? error.code : 'GOOGLE_OAUTH_UNKNOWN_ERROR';
    logger.warn(
      { err: errorCode, correlationId: req.headers.get('x-request-id') },
      'Google OAuth callback failed',
    );
    return NextResponse.redirect(
      new URL(`/login?error=google_auth_failed&reason=${encodeURIComponent(errorCode)}`, req.url),
    );
  }
}
