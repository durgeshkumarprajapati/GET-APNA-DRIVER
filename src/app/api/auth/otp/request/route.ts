import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { requestPhoneOtp } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';

const schema = z.object({
  phoneNumber: z.string().min(8),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Valid phone number is required', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    const rateLimit = await checkRateLimit(
      'otp_request',
      `${ip}:${parsed.data.phoneNumber}`,
      3,
      10 * 60,
    );
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError('OTP request limit reached; please try again later');
    }

    const { expiresAt } = await requestPhoneOtp({ phoneNumber: parsed.data.phoneNumber });

    return NextResponse.json(
      { message: 'OTP dispatched successfully', expiresAt: expiresAt.toISOString() },
      { status: 200 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
