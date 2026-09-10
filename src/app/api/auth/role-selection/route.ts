import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';
import { selectRoleForUser } from '@/modules/identity/application/services/role-selection-service';

const PENDING_PROFILE_COOKIE = 'oauth_pending_profile';

// Only these two literal values can ever parse — z.enum rejects
// "ADMINISTRATOR" or anything else before the request body even reaches
// the service layer, which independently re-checks the same thing.
const roleSelectionSchema = z.object({
  role: z.enum(['CUSTOMER', 'DRIVER']),
});

export const POST = withAuth(async (req, { principal }) => {
  // Defense-in-depth against scripted retries — role selection is a
  // one-time, idempotency-guarded operation (selectRoleForUser rejects a
  // second call outright), so this only needs to absorb noisy clients, not
  // enforce the actual security invariant.
  const rateLimit = await checkRateLimit('role_selection', principal.userId, 5, 10 * 60);
  if (!rateLimit.allowed) {
    throw new RateLimitExceededError('Too many role-selection attempts; please try again later');
  }

  const body = await req.json();
  const parsed = roleSelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'A valid role (CUSTOMER or DRIVER) is required' },
      { status: 400 },
    );
  }

  let profileHint: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  } | null = null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PENDING_PROFILE_COOKIE)?.value;
    if (raw) {
      profileHint = JSON.parse(raw);
    }
    cookieStore.delete(PENDING_PROFILE_COOKIE);
  } catch {
    // A malformed/missing hint cookie is never fatal — the user just fills
    // in their profile manually afterwards.
    profileHint = null;
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  const completion = await selectRoleForUser(principal.userId, parsed.data.role, profileHint, {
    ipAddress: ip,
    userAgent,
  });

  return NextResponse.json({ completion }, { status: 200 });
});
