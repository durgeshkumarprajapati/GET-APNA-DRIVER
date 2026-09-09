import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { toErrorResponse } from '@/shared/errors/app-error';
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
 * Wraps a route handler to require an active, authenticated user.
 */
export function withAuth<P = unknown>(handler: AuthenticatedRouteHandler<P>) {
  return async (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requireAuthenticatedUser(principal);
      return await handler(req, { principal: authenticated }, routeContext);
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  };
}

/**
 * Wraps a route handler to require a specific system role.
 */
export function withRole<P = unknown>(roleCode: string, handler: AuthenticatedRouteHandler<P>) {
  return async (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requireRole(principal, roleCode);
      return await handler(req, { principal: authenticated }, routeContext);
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
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
    try {
      const principal = await getPrincipalFromRequest(req);
      const authenticated = requirePermission(principal, permissionCode);
      return await handler(req, { principal: authenticated }, routeContext);
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  };
}
