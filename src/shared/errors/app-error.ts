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
