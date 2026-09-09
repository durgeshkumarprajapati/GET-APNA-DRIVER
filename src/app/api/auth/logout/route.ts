import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  validateSessionToken,
  revokeSession,
} from '@/modules/identity/application/services/session-service';

export const POST = withAuth(async (_req, { principal }) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;

    if (token) {
      const validated = await validateSessionToken(token);
      if (validated) {
        await revokeSession(validated.session.id, principal.userId);
      }
    }
  } catch {
    // Session token revocation fallback
  }

  return NextResponse.json({ message: 'Successfully logged out' }, { status: 200 });
});
