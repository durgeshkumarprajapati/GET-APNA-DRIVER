jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
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

describe('Session Service', () => {
  const mockedCreateUserSession = sessionRepository.createUserSession as jest.Mock;
  const mockedFindSession = sessionRepository.findSessionByTokenHash as jest.Mock;
  const mockedRevokeSession = sessionRepository.revokeSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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
