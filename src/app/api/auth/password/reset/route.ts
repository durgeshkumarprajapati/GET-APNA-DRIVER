import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { resetPasswordWithToken } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimit = await checkRateLimit('password_reset', ip, 5, 15 * 60);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError();
    }

    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Token and valid new password are required', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);

    return NextResponse.json({ message: 'Password has been successfully reset' }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
