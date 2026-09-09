import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { toErrorResponse, AppError } from '@/shared/errors/app-error';
import { logger } from '@/shared/logging/logger';
import { getPrincipalFromSessionToken } from '../application/services/principal-service';
import { requireAuthenticatedUser, requireRole, requirePermission } from './authorization-service';
import type { AuthenticatedPrincipal } from '../domain/types';

export interface AuthenticatedRequestContext {
  principal: AuthenticatedPrincipal;
}

export type AuthenticatedRouteHandler<P = unknown> = (
  req: NextRequest,
  context: AuthenticatedRequestContext,
  routeContext?: P,
) => Promise<NextResponse>;

/**
 * Extracts session token from cookies or Authorization header and resolves principal.
 */
export async function getPrincipalFromRequest(
  req: NextRequest,
): Promise<AuthenticatedPrincipal | null> {
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  } catch {
    // Expected outside request context
  }

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return null;
  }

  return getPrincipalFromSessionToken(token);
}

/**
 * Structured per-request log line: requestId (from middleware.ts, reused if
 * the caller supplied one), route, method, resolved userId (once known),
 * duration, and outcome status/error code. Every withAuth/withRole/
 * withPermission-wrapped route gets this uniformly — that's the large
 * majority of the app's API surface.
 */
function logOutcome(
  req: NextRequest,
  startedAt: number,
  outcome: { statusCode: number; userId?: string; errorCode?: string },
): void {
  const durationMs = Date.now() - startedAt;
  const level = outcome.statusCode >= 500 ? 'error' : outcome.statusCode >= 400 ? 'warn' : 'info';
  logger[level](
    {
      requestId: req.headers.get('x-request-id') ?? undefined,
      method: req.method,
      route: req.nextUrl.pathname,
      userId: outcome.userId,
      statusCode: outcome.statusCode,
      durationMs,
      errorCode: outcome.errorCode,
    },
    'api_request',
  );
}

/**
 * Wraps a route handler to require an active, authenticated user.
 */
export function withAuth<P = unknown>(handler: AuthenticatedRouteHandler<P>) {
  return async (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
    const startedAt = Date.now();
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requireAuthenticatedUser(principal);
      const response = await handler(req, { principal: authenticated }, routeContext);
      logOutcome(req, startedAt, { statusCode: response.status, userId: authenticated.userId });
      return response;
    } catch (error: unknown) {
      const response = toErrorResponse(error, req.nextUrl.pathname);
      logOutcome(req, startedAt, {
        statusCode: response.status,
        errorCode: error instanceof AppError ? error.code : undefined,
      });
      return response;
    }
  };
}

/**
 * Wraps a route handler to require a specific system role.
 */
export function withRole<P = unknown>(roleCode: string, handler: AuthenticatedRouteHandler<P>) {
  return async (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
    const startedAt = Date.now();
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requireRole(principal, roleCode);
      const response = await handler(req, { principal: authenticated }, routeContext);
      logOutcome(req, startedAt, { statusCode: response.status, userId: authenticated.userId });
      return response;
    } catch (error: unknown) {
      const response = toErrorResponse(error, req.nextUrl.pathname);
      logOutcome(req, startedAt, {
        statusCode: response.status,
        errorCode: error instanceof AppError ? error.code : undefined,
      });
      return response;
    }
  };
}

/**
 * Wraps a route handler to require a specific permission.
 */
export function withPermission<P = unknown>(
  permissionCode: string,
  handler: AuthenticatedRouteHandler<P>,
) {
  return async (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
    const startedAt = Date.now();
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requirePermission(principal, permissionCode);
      const response = await handler(req, { principal: authenticated }, routeContext);
      logOutcome(req, startedAt, { statusCode: response.status, userId: authenticated.userId });
      return response;
    } catch (error: unknown) {
      const response = toErrorResponse(error, req.nextUrl.pathname);
      logOutcome(req, startedAt, {
        statusCode: response.status,
        errorCode: error instanceof AppError ? error.code : undefined,
      });
      return response;
    }
  };
}
