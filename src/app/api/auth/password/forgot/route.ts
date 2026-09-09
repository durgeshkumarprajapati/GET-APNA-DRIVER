import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { requestPasswordReset } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimit = await checkRateLimit('forgot_password', ip, 3, 60 * 60);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (parsed.success) {
      await requestPasswordReset(parsed.data.email);
    }

    return NextResponse.json(
      {
        message:
          'If an account exists with this email, password reset instructions have been sent.',
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
