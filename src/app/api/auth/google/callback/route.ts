import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { toErrorResponse } from '@/shared/errors/app-error';
import { handleGoogleOAuthCallback } from '@/modules/identity/application/services/auth-service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing OAuth authorization code or state', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    try {
      const cookieStore = await cookies();
      const savedState = cookieStore.get('oauth_state')?.value;
      if (savedState && savedState !== state) {
        return NextResponse.json(
          { error: 'OAuth state mismatch / CSRF detected', code: 'CSRF_STATE_MISMATCH' },
          { status: 400 },
        );
      }
      cookieStore.delete('oauth_state');
    } catch {
      // Expected in non-request test contexts
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = req.headers.get('user-agent');

    await handleGoogleOAuthCallback(code, { ipAddress: ip, userAgent });

    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
