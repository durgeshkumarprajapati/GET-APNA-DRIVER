import 'server-only';
import { env } from '@/shared/config/env';

export interface GoogleUserProfile {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

export function getGoogleAuthorizationUrl(state: string): string {
  const clientId = env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
  const redirectUri = env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForProfile(code: string): Promise<GoogleUserProfile> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    // In dev mode when credentials are not configured, allow mock verification for testing
    if (env.NODE_ENV !== 'production' && code.startsWith('mock_code_')) {
      const mockSub = code.replace('mock_code_', 'google_sub_');
      return {
        sub: mockSub,
        email: `user_${mockSub}@example.com`,
        emailVerified: true,
        name: 'Mock Google User',
      };
    }
    throw new Error('Google OAuth credentials not configured');
  }

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
    const errorText = await tokenRes.text();
    throw new Error(`Failed to exchange Google OAuth code: ${errorText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; id_token: string };

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  const profileData = (await userRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  return {
    sub: profileData.sub,
    email: profileData.email,
    emailVerified: profileData.email_verified,
    name: profileData.name,
    picture: profileData.picture,
  };
}
