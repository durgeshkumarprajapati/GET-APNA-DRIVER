import 'server-only';
import { Prisma, type User, type UserIdentity } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import * as userRepository from '../../infrastructure/user-repository';
import { normalizeEmail, isValidEmail } from '../../validation/email';
import { normalizePhoneNumber, isValidE164PhoneNumber } from '../../validation/phone';
import {
  DuplicateIdentityError,
  InvalidEmailError,
  InvalidPhoneNumberError,
} from '../../domain/errors';
import type { IdentityProviderType } from '../../domain/types';

export type CreateUserWithIdentityInput =
  | { providerName: 'email'; email: string }
  | { providerName: 'phone'; phoneNumber: string }
  | { providerName: 'google'; googleSubject: string; email?: string };

interface ResolvedIdentityFields {
  providerType: IdentityProviderType;
  providerName: string;
  providerSubject: string;
  email: string | null;
  phoneNumber: string | null;
}

function resolveIdentityFields(input: CreateUserWithIdentityInput): ResolvedIdentityFields {
  if (input.providerName === 'email') {
    const normalized = normalizeEmail(input.email);
    if (!isValidEmail(normalized)) {
      throw new InvalidEmailError();
    }
    return {
      providerType: 'EMAIL',
      providerName: 'email',
      providerSubject: normalized,
      email: normalized,
      phoneNumber: null,
    };
  }

  if (input.providerName === 'phone') {
    const normalized = normalizePhoneNumber(input.phoneNumber);
    if (!isValidE164PhoneNumber(normalized)) {
      throw new InvalidPhoneNumberError();
    }
    return {
      providerType: 'PHONE',
      providerName: 'phone',
      providerSubject: normalized,
      email: null,
      phoneNumber: normalized,
    };
  }

  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    throw new InvalidEmailError();
  }
  return {
    providerType: 'OAUTH',
    providerName: 'google',
    providerSubject: input.googleSubject,
    email: normalizedEmail,
    phoneNumber: null,
  };
}

/**
 * Creates a new User together with its first authentication identity.
 * Account status starts PENDING — activation happens once the identity is
 * verified, which is out of scope until the authentication phase.
 */
export async function createUserWithIdentity(
  input: CreateUserWithIdentityInput,
): Promise<{ user: User; identity: UserIdentity }> {
  const resolved = resolveIdentityFields(input);

  return prisma.$transaction(async (tx: Db) => {
    const existing = await userRepository.findIdentityByProvider(
      tx,
      resolved.providerName,
      resolved.providerSubject,
    );
    if (existing) {
      throw new DuplicateIdentityError(resolved.providerName);
    }

    // The findIdentityByProvider check above is not enough on its own: two
    // concurrent requests for the same identity can both pass it before
    // either commits. The unique constraint on (providerName,
    // providerSubject) is the real guarantee; this turns its violation into
    // the same domain error instead of leaking a raw Prisma error.
    const { user, identity } = await userRepository
      .createUserWithIdentity(tx, {
        providerType: resolved.providerType,
        providerName: resolved.providerName,
        providerSubject: resolved.providerSubject,
        email: resolved.email,
        phoneNumber: resolved.phoneNumber,
      })
      .catch((error: unknown) => {
        if (
          (error instanceof Prisma.PrismaClientKnownRequestError ||
            (typeof error === 'object' && error !== null && 'code' in error)) &&
          (error as { code?: string }).code === 'P2002'
        ) {
          throw new DuplicateIdentityError(resolved.providerName);
        }
        throw error;
      });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'identity.user.created',
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { accountStatus: user.accountStatus, providerName: resolved.providerName },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'user.created',
      aggregateType: 'User',
      aggregateId: user.id,
      payload: { userId: user.id, providerName: resolved.providerName },
    });

    return { user, identity };
  });
}
