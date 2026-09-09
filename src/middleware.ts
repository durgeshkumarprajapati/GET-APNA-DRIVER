import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns every incoming request a correlation ID — reused if the caller
 * (e.g. an upstream load balancer, or a test) already supplied one via
 * `x-request-id`, generated otherwise. Propagated both forward (into the
 * request headers the route handler sees) and back (as a response header),
 * so it can be correlated across client, server logs, and any downstream
 * service. Runs for every request, not just authenticated/API ones, since
 * unauthenticated and webhook routes need correlation too.
 */
export function middleware(request: NextRequest): NextResponse {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Every request except static assets and the Next.js internal build
  // manifest paths — those never reach application code, so a correlation
  // ID for them would be pure overhead.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
