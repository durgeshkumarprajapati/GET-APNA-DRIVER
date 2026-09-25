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

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(message, 400, code);
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
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
      message =
        'This mobile number is already registered. Please sign in or use a different number.';
    } else if (targetStr.includes('email')) {
      message =
        'This email address is already registered. Please sign in or use a different email.';
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

  // Fallback for standard Errors with human-readable validation/business messages
  if (
    error instanceof Error &&
    !(error instanceof TypeError) &&
    !(error instanceof ReferenceError) &&
    !(error instanceof SyntaxError) &&
    !(error instanceof RangeError) &&
    !(error instanceof URIError) &&
    error.message &&
    !error.message.includes('ECONNREFUSED') &&
    !error.message.includes('PrismaClient')
  ) {
    logger.warn({ err: error, path }, 'Standard Error converted to 400 validation response');
    return NextResponse.json(
      {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: error.message,
        path,
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
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
