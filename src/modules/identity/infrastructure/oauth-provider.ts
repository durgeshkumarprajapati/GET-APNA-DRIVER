import 'server-only';
import { env } from '@/shared/config/env';
import { GoogleOAuthExchangeFailedError, GoogleOAuthNotConfiguredError } from '../domain/errors';

export interface GoogleUserProfile {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

const DEFAULT_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

/**
 * Throws GoogleOAuthNotConfiguredError when GOOGLE_CLIENT_ID is unset,
 * rather than falling back to a fake client ID — a broken/fake client ID
 * would silently produce a Google-hosted error page instead of a clear,
 * honest failure the caller can present to the user (see route.ts).
 */
export function getGoogleAuthorizationUrl(state: string): string {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new GoogleOAuthNotConfiguredError();
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges an authorization code for a verified Google identity via a real
 * server-to-server call — no mock/bypass path exists here at all. Tests
 * mock this module directly (`jest.mock('.../oauth-provider')`), the same
 * pattern already established for PaymentProvider/PayoutProvider, rather
 * than this function special-casing "test mode" itself.
 */
export async function exchangeGoogleCodeForProfile(code: string): Promise<GoogleUserProfile> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleOAuthNotConfiguredError();
  }
  const redirectUri = env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    // The response body may echo back query parameters but never our own
    // client_secret, so it's safe to fold into the error message.
    const errorText = await tokenRes.text();
    throw new GoogleOAuthExchangeFailedError(`token exchange failed (${errorText.slice(0, 200)})`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; id_token: string };

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new GoogleOAuthExchangeFailedError('failed to fetch Google user profile');
  }

  const profileData = (await userRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  return {
    sub: profileData.sub,
    email: profileData.email,
    emailVerified: profileData.email_verified,
    name: profileData.name,
    givenName: profileData.given_name,
    familyName: profileData.family_name,
    picture: profileData.picture,
  };
}
