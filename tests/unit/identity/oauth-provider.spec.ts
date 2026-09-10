// A fully static factory (no closed-over variable) — ES imports are
// hoisted above any local variable initializer in this file regardless of
// jest's own jest.mock hoisting, so a factory that reads an
// externally-declared `let`/`var` would see it still uninitialized. Tests
// instead mutate the fields of this same object afterwards via
// `jest.requireMock`.
jest.mock('@/shared/config/env', () => ({
  env: {
    GOOGLE_CLIENT_ID: undefined,
    GOOGLE_CLIENT_SECRET: undefined,
    GOOGLE_REDIRECT_URI: undefined,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}));

import {
  exchangeGoogleCodeForProfile,
  getGoogleAuthorizationUrl,
} from '@/modules/identity/infrastructure/oauth-provider';
import {
  GoogleOAuthExchangeFailedError,
  GoogleOAuthNotConfiguredError,
} from '@/modules/identity/domain/errors';

const mockEnv = (
  jest.requireMock('@/shared/config/env') as { env: Record<string, string | undefined> }
).env;

describe('getGoogleAuthorizationUrl', () => {
  afterEach(() => {
    mockEnv.GOOGLE_CLIENT_ID = undefined;
    mockEnv.GOOGLE_REDIRECT_URI = undefined;
  });

  it('throws GoogleOAuthNotConfiguredError when GOOGLE_CLIENT_ID is unset — never falls back to a fake client id', () => {
    expect(() => getGoogleAuthorizationUrl('state-1')).toThrow(GoogleOAuthNotConfiguredError);
  });

  it('builds a real Google authorization URL with the configured client id and given state', () => {
    mockEnv.GOOGLE_CLIENT_ID = 'real-client-id';
    const url = getGoogleAuthorizationUrl('state-xyz');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
    expect(url).toContain('client_id=real-client-id');
    expect(url).toContain('state=state-xyz');
    expect(url).toContain('scope=openid+email+profile');
  });
});

describe('exchangeGoogleCodeForProfile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    mockEnv.GOOGLE_CLIENT_ID = undefined;
    mockEnv.GOOGLE_CLIENT_SECRET = undefined;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws GoogleOAuthNotConfiguredError when credentials are unset — no mock-code bypass exists', async () => {
    await expect(exchangeGoogleCodeForProfile('mock_code_anything')).rejects.toThrow(
      GoogleOAuthNotConfiguredError,
    );
  });

  it('throws GoogleOAuthExchangeFailedError when the token endpoint rejects the code', async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'client-id';
    mockEnv.GOOGLE_CLIENT_SECRET = 'client-secret';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('invalid_grant'),
    }) as unknown as typeof fetch;

    await expect(exchangeGoogleCodeForProfile('bad-code')).rejects.toThrow(
      GoogleOAuthExchangeFailedError,
    );
  });

  it('throws GoogleOAuthExchangeFailedError when the userinfo endpoint fails after a successful token exchange', async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'client-id';
    mockEnv.GOOGLE_CLIENT_SECRET = 'client-secret';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'tok' }) })
      .mockResolvedValueOnce({ ok: false }) as unknown as typeof fetch;

    await expect(exchangeGoogleCodeForProfile('good-code')).rejects.toThrow(
      GoogleOAuthExchangeFailedError,
    );
  });

  it('returns the full verified profile (sub, email, verification, given/family name, picture) on success', async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'client-id';
    mockEnv.GOOGLE_CLIENT_SECRET = 'client-secret';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'tok' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sub: 'google-sub-123',
            email: 'user@example.com',
            email_verified: true,
            name: 'Asha Rao',
            given_name: 'Asha',
            family_name: 'Rao',
            picture: 'https://example.com/pic.png',
          }),
      }) as unknown as typeof fetch;

    const profile = await exchangeGoogleCodeForProfile('good-code');

    expect(profile).toEqual({
      sub: 'google-sub-123',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Asha Rao',
      givenName: 'Asha',
      familyName: 'Rao',
      picture: 'https://example.com/pic.png',
    });
  });

  it("never sends the client secret to any endpoint other than Google's own token endpoint", async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'client-id';
    mockEnv.GOOGLE_CLIENT_SECRET = 'super-secret-value';
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'tok' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sub: 's', email_verified: true }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    await exchangeGoogleCodeForProfile('good-code');

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(String(tokenInit.body)).toContain('super-secret-value');

    const [userinfoUrl, userinfoInit] = fetchMock.mock.calls[1];
    expect(userinfoUrl).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    expect(JSON.stringify(userinfoInit)).not.toContain('super-secret-value');
  });
});
