import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toErrorResponse } from '@/shared/errors/app-error';
import { verifyEmailWithToken } from '@/modules/identity/application/services/auth-service';

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Token is required', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    const { user } = await verifyEmailWithToken(parsed.data.token);

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        user: { id: user.id, accountStatus: user.accountStatus },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
