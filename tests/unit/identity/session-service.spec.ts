const mockCookieJar = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieJar)),
}));

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/session-repository', () => ({
  createUserSession: jest.fn(),
  findSessionByTokenHash: jest.fn(),
  updateSessionLastUsed: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllUserSessions: jest.fn(),
}));

import {
  createSessionForUser,
  validateSessionToken,
  revokeSession,
} from '@/modules/identity/application/services/session-service';
import * as sessionRepository from '@/modules/identity/infrastructure/session-repository';
import { hashToken } from '@/modules/identity/security/tokens';
import { prisma } from '@/shared/database/prisma';

describe('Session Service', () => {
  const mockedCreateUserSession = sessionRepository.createUserSession as jest.Mock;
  const mockedFindSession = sessionRepository.findSessionByTokenHash as jest.Mock;
  const mockedRevokeSession = sessionRepository.revokeSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieJar.get.mockReturnValue(undefined);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('creates session with hashed token and returns raw token', async () => {
    mockedCreateUserSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      sessionTokenHash: 'hash-val',
      expiresAt: new Date(Date.now() + 100000),
    });

    const result = await createSessionForUser('user-123', {
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });

    expect(result.rawToken).toBeDefined();
    expect(result.session.id).toBe('session-1');
    expect(mockedCreateUserSession).toHaveBeenCalled();
  });

  describe('locale preference restoration on login', () => {
    beforeEach(() => {
      mockedCreateUserSession.mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        sessionTokenHash: 'hash-val',
        expiresAt: new Date(Date.now() + 100000),
      });
    });

    it("restores the user's DB locale preference when no locale cookie exists yet", async () => {
      mockCookieJar.get.mockReturnValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ preferredLocale: 'hi' });

      await createSessionForUser('user-123');

      expect(mockCookieJar.set).toHaveBeenCalledWith(
        'gad_locale',
        'hi',
        expect.objectContaining({ path: '/' }),
      );
    });

    it('does not override an existing locale cookie with the DB preference', async () => {
      mockCookieJar.get.mockReturnValue({ value: 'gu' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ preferredLocale: 'hi' });

      await createSessionForUser('user-123');

      expect(mockCookieJar.set).not.toHaveBeenCalledWith(
        'gad_locale',
        expect.anything(),
        expect.anything(),
      );
    });

    it('does not set a locale cookie when the DB preference is not a supported locale', async () => {
      mockCookieJar.get.mockReturnValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ preferredLocale: 'fr' });

      await createSessionForUser('user-123');

      expect(mockCookieJar.set).not.toHaveBeenCalledWith(
        'gad_locale',
        expect.anything(),
        expect.anything(),
      );
    });

    it('does not set a locale cookie when the user cannot be found', async () => {
      mockCookieJar.get.mockReturnValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await createSessionForUser('user-123');

      expect(mockCookieJar.set).not.toHaveBeenCalledWith(
        'gad_locale',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it('validates active unexpired session token', async () => {
    const rawToken = 'test-raw-token';
    const tokenHash = hashToken(rawToken);

    mockedFindSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
      lastUsedAt: new Date(),
      user: { id: 'user-123', accountStatus: 'ACTIVE' },
    });

    const validated = await validateSessionToken(rawToken);

    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe('user-123');
  });

  it('returns null if session is revoked', async () => {
    const rawToken = 'revoked-raw-token';
    const tokenHash = hashToken(rawToken);

    mockedFindSession.mockResolvedValue({
      id: 'session-2',
      userId: 'user-123',
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: new Date(),
      lastUsedAt: new Date(),
      user: { id: 'user-123', accountStatus: 'ACTIVE' },
    });

    const validated = await validateSessionToken(rawToken);
    expect(validated).toBeNull();
  });

  it('returns null if session user is DELETED', async () => {
    const rawToken = 'deleted-raw-token';
    const tokenHash = hashToken(rawToken);

    mockedFindSession.mockResolvedValue({
      id: 'session-3',
      userId: 'user-123',
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
      lastUsedAt: new Date(),
      user: { id: 'user-123', accountStatus: 'DELETED' },
    });

    const validated = await validateSessionToken(rawToken);
    expect(validated).toBeNull();
  });

  it('revokes session properly', async () => {
    mockedRevokeSession.mockResolvedValue(undefined);
    await revokeSession('session-123', 'user-123');
    expect(mockedRevokeSession).toHaveBeenCalledWith(expect.anything(), 'session-123');
  });
});
