jest.mock('@/shared/database/prisma', () => ({
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  findIdentityByProvider: jest.fn(),
  createUserWithIdentity: jest.fn(),
}));

// @prisma/client is only resolvable after `prisma generate` has run against a
// real database (see README/phase report). Stub just the bit user-service.ts
// needs at runtime (Prisma.PrismaClientKnownRequestError, used to translate a
// concurrent-insert race into DuplicateIdentityError) so this suite doesn't
// depend on that.
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, codeOrOptions: string | { code: string }) {
        super(message);
        this.code = typeof codeOrOptions === 'string' ? codeOrOptions : codeOrOptions.code;
      }
    },
  },
}));

import { createUserWithIdentity } from '@/modules/identity/application/services/user-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { Prisma } from '@prisma/client';
import {
  DuplicateIdentityError,
  InvalidEmailError,
  InvalidPhoneNumberError,
} from '@/modules/identity/domain/errors';

const mockedFindIdentity = userRepository.findIdentityByProvider as jest.Mock;
const mockedCreateUser = userRepository.createUserWithIdentity as jest.Mock;
const mockedRecordAuditLog = recordAuditLog as jest.Mock;
const mockedInsertOutboxEvent = insertOutboxEvent as jest.Mock;

describe('createUserWithIdentity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user with a normalized email identity', async () => {
    mockedFindIdentity.mockResolvedValue(null);
    mockedCreateUser.mockResolvedValue({
      user: { id: 'user-1', accountStatus: 'PENDING' },
      identity: { id: 'identity-1', providerName: 'email', providerSubject: 'user@example.com' },
    });

    const result = await createUserWithIdentity({
      providerName: 'email',
      email: '  User@Example.com ',
    });

    expect(mockedFindIdentity).toHaveBeenCalledWith(expect.anything(), 'email', 'user@example.com');
    expect(mockedCreateUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        providerName: 'email',
        providerSubject: 'user@example.com',
        email: 'user@example.com',
      }),
    );
    expect(mockedRecordAuditLog).toHaveBeenCalledTimes(1);
    expect(mockedInsertOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'user.created' }),
    );
    expect(result.user.id).toBe('user-1');
  });

  it('rejects an invalid email and never touches the repository', async () => {
    await expect(
      createUserWithIdentity({ providerName: 'email', email: 'not-an-email' }),
    ).rejects.toThrow(InvalidEmailError);
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('normalizes and accepts a well-formed phone identity', async () => {
    mockedFindIdentity.mockResolvedValue(null);
    mockedCreateUser.mockResolvedValue({
      user: { id: 'user-2', accountStatus: 'PENDING' },
      identity: { id: 'identity-2' },
    });

    await createUserWithIdentity({ providerName: 'phone', phoneNumber: ' +919876543210 ' });

    expect(mockedCreateUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ providerName: 'phone', providerSubject: '+919876543210' }),
    );
  });

  it('rejects a phone number that is not in E.164 format', async () => {
    await expect(
      createUserWithIdentity({ providerName: 'phone', phoneNumber: '9876543210' }),
    ).rejects.toThrow(InvalidPhoneNumberError);
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('rejects creating a user when the identity already exists', async () => {
    mockedFindIdentity.mockResolvedValue({ id: 'identity-existing' });

    await expect(
      createUserWithIdentity({ providerName: 'email', email: 'duplicate@example.com' }),
    ).rejects.toThrow(DuplicateIdentityError);
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('turns a concurrent-insert unique-constraint violation into DuplicateIdentityError', async () => {
    // The findIdentityByProvider pre-check race: it passed (returned null)
    // for two simultaneous requests, but only one insert can win the DB's
    // unique constraint.
    mockedFindIdentity.mockResolvedValue(null);
    mockedCreateUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      createUserWithIdentity({ providerName: 'email', email: 'race@example.com' }),
    ).rejects.toThrow(DuplicateIdentityError);
  });

  it('accepts a google identity with an optional verified email', async () => {
    mockedFindIdentity.mockResolvedValue(null);
    mockedCreateUser.mockResolvedValue({
      user: { id: 'user-3', accountStatus: 'PENDING' },
      identity: { id: 'identity-3' },
    });

    await createUserWithIdentity({
      providerName: 'google',
      googleSubject: 'google-sub-123',
      email: 'g@example.com',
    });

    expect(mockedCreateUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        providerType: 'OAUTH',
        providerName: 'google',
        providerSubject: 'google-sub-123',
        email: 'g@example.com',
      }),
    );
  });
});
