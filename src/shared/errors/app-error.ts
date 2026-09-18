import 'server-only';
import { NextResponse } from 'next/server';
import { logger } from '../logging/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  timestamp: string;
}

export function toErrorResponse(error: unknown, path: string): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        path,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  // Handle Prisma Unique Constraint Failure (P2002) gracefully
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  ) {
    const meta = (
      error as {
        meta?: {
          target?: string[] | string;
          driverAdapterError?: { cause?: { constraint?: { index?: string } } };
        };
      }
    ).meta;
    const targetStr = JSON.stringify(meta || {}).toLowerCase();

    let message = 'A record with this information already exists in the system.';
    if (targetStr.includes('phone') || targetStr.includes('mobile')) {
      message = 'This mobile number is already registered. Please sign in or use a different number.';
    } else if (targetStr.includes('email')) {
      message = 'This email address is already registered. Please sign in or use a different email.';
    }

    return NextResponse.json(
      {
        statusCode: 409,
        code: 'IDENTITY_DUPLICATE',
        message,
        path,
        timestamp: new Date().toISOString(),
      },
      { status: 409 },
    );
  }

  logger.error({ err: error, path }, 'Unhandled exception');

  return NextResponse.json(
    {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      path,
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
}
