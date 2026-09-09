import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { registerWithEmailPassword } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimit = await checkRateLimit('register', ip, 10, 15 * 60);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const body = (await req.json()) as unknown;
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input format', code: 'INVALID_INPUT', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get('user-agent');
    const result = await registerWithEmailPassword(parsed.data, {
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          accountStatus: result.user.accountStatus,
          createdAt: result.user.createdAt,
        },
        identity: result.identity
          ? {
              id: result.identity.id,
              providerName: result.identity.providerName,
              email: result.identity.email,
              verifiedAt: result.identity.verifiedAt,
            }
          : undefined,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
