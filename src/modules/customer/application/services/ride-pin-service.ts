import 'server-only';
import randomInt from 'crypto';
import { prisma, type Db } from '@/shared/database/prisma';
import { hashPassword, verifyPassword } from '@/modules/identity/security/password';
import { AppError } from '@/shared/errors/app-error';

export class InvalidRidePinFormatError extends AppError {
  constructor(reason: string) {
    super(`Invalid Ride PIN: ${reason}`, 400, 'INVALID_RIDE_PIN_FORMAT');
  }
}

export class CustomerPinNotSetError extends AppError {
  constructor() {
    super('Customer has not set up a Ride PIN yet.', 400, 'CUSTOMER_PIN_NOT_SET');
  }
}

const WEAK_PINS = new Set([
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
  '012345',
  '543210',
]);

/**
 * Generates a cryptographically secure 6-digit numeric Ride PIN.
 * Preserves leading zeroes (returns 6-character numeric string).
 */
export function generateSecureRidePin(): string {
  const pinNum = randomInt.randomInt(0, 1000000);
  return pinNum.toString().padStart(6, '0');
}

/**
 * Validates Ride PIN policy:
 * - Exactly 6 numeric digits
 * - Rejects obvious repeating patterns (000000, 111111...)
 * - Rejects simple sequential patterns (123456, 654321...)
 */
export function validatePinPolicy(pin: string): void {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    throw new InvalidRidePinFormatError('PIN must be exactly 6 numeric digits.');
  }

  if (WEAK_PINS.has(pin)) {
    throw new InvalidRidePinFormatError(
      'PIN is too simple or weak. Please choose a non-sequential 6-digit PIN.',
    );
  }
}

export interface CustomerPinStatus {
  isPinSet: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Checks whether a customer has configured a 6-digit Ride PIN.
 * Never returns the hash or raw PIN.
 */
export async function getCustomerPinStatus(
  userIdOrProfileId: string,
  db: Db = prisma,
): Promise<CustomerPinStatus> {
  const profile = await db.customerProfile.findFirst({
    where: {
      OR: [{ id: userIdOrProfileId }, { userId: userIdOrProfileId }],
    },
    select: {
      customerRidePinHash: true,
      customerRidePinCreatedAt: true,
      customerRidePinUpdatedAt: true,
    },
  });

  if (!profile || !profile.customerRidePinHash) {
    return { isPinSet: false, createdAt: null, updatedAt: null };
  }

  return {
    isPinSet: true,
    createdAt: profile.customerRidePinCreatedAt
      ? profile.customerRidePinCreatedAt.toISOString()
      : null,
    updatedAt: profile.customerRidePinUpdatedAt
      ? profile.customerRidePinUpdatedAt.toISOString()
      : null,
  };
}

/**
 * Hashes and persists a new 6-digit Ride PIN for a customer.
 */
export async function setCustomerRidePin(
  userIdOrProfileId: string,
  newPin: string,
  db: Db = prisma,
): Promise<CustomerPinStatus> {
  validatePinPolicy(newPin);

  const profile = await db.customerProfile.findFirst({
    where: {
      OR: [{ id: userIdOrProfileId }, { userId: userIdOrProfileId }],
    },
  });

  if (!profile) {
    throw new AppError('Customer profile not found.', 404, 'CUSTOMER_NOT_FOUND');
  }

  const hashedPin = await hashPassword(newPin);
  const now = new Date();

  const updated = await db.customerProfile.update({
    where: { id: profile.id },
    data: {
      customerRidePinHash: hashedPin,
      customerRidePinCreatedAt: profile.customerRidePinCreatedAt ?? now,
      customerRidePinUpdatedAt: now,
    },
  });

  return {
    isPinSet: true,
    createdAt: updated.customerRidePinCreatedAt
      ? updated.customerRidePinCreatedAt.toISOString()
      : null,
    updatedAt: updated.customerRidePinUpdatedAt
      ? updated.customerRidePinUpdatedAt.toISOString()
      : null,
  };
}

/**
 * Verifies a candidate 6-digit Ride PIN against the customer's stored PIN hash.
 */
export async function verifyCustomerRidePin(
  userIdOrProfileId: string,
  candidatePin: string,
  db: Db = prisma,
): Promise<boolean> {
  const profile = await db.customerProfile.findFirst({
    where: {
      OR: [{ id: userIdOrProfileId }, { userId: userIdOrProfileId }],
    },
    select: { customerRidePinHash: true },
  });

  if (!profile || !profile.customerRidePinHash) {
    throw new CustomerPinNotSetError();
  }

  return verifyPassword(candidatePin, profile.customerRidePinHash);
}
