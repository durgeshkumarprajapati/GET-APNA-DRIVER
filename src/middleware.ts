import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';
const LOCALE_HEADER = 'x-locale';
const LOCALE_COOKIE = 'gad_locale';

/**
 * Assigns correlation ID and locale context to incoming requests.
 * Detects language preference from gad_locale cookie or Accept-Language header.
 */
export function middleware(request: NextRequest): NextResponse {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();

  // Detect locale
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  let locale = 'en';
  if (cookieLocale && ['en', 'hi', 'gu'].includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const acceptLang = request.headers.get('accept-language');
    if (acceptLang) {
      if (acceptLang.includes('hi')) locale = 'hi';
      else if (acceptLang.includes('gu')) locale = 'gu';
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set(LOCALE_HEADER, locale);

  if (!cookieLocale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
