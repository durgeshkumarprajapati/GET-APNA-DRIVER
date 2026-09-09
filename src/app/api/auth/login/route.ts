import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { loginWithEmailPassword } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = (await req.json()) as unknown;
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    const rateLimitKey = `${ip}:${parsed.data.email.toLowerCase()}`;
    const rateLimit = await checkRateLimit('login', rateLimitKey, 5, 15 * 60);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const userAgent = req.headers.get('user-agent');
    const result = await loginWithEmailPassword(parsed.data, {
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          accountStatus: result.user.accountStatus,
        },
        identity: result.identity
          ? {
              id: result.identity.id,
              providerName: result.identity.providerName,
              email: result.identity.email,
            }
          : undefined,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
