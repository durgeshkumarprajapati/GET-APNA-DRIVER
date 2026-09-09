import { NextResponse } from 'next/server';
import { checkReadiness } from '@/shared/health/health-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export async function GET(): Promise<NextResponse> {
  try {
    const result = await checkReadiness();
    return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 503 });
  } catch (error) {
    return toErrorResponse(error, '/api/health/ready');
  }
}
