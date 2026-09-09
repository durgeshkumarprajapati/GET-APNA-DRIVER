import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { verifyPhoneOtp } from '@/modules/identity/application/services/auth-service';
import { RateLimitExceededError } from '@/modules/identity/domain/errors';

const schema = z.object({
  phoneNumber: z.string().min(8),
  otp: z.string().min(4).max(8),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Phone number and OTP code are required', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    const rateLimit = await checkRateLimit(
      'otp_verify',
      `${ip}:${parsed.data.phoneNumber}`,
      5,
      10 * 60,
    );
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError('Maximum verification attempts reached');
    }

    const userAgent = req.headers.get('user-agent');
    const result = await verifyPhoneOtp(parsed.data, { ipAddress: ip, userAgent });

    return NextResponse.json(
      {
        user: { id: result.user.id, accountStatus: result.user.accountStatus },
        identity: result.identity
          ? { id: result.identity.id, providerName: result.identity.providerName }
          : undefined,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
