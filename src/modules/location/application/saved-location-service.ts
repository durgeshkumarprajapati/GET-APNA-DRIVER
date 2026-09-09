import 'server-only';
import type { SavedLocation } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

export interface CreateSavedLocationInput {
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface UpdateSavedLocationInput {
  label?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees.');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees.');
  }
}

/**
 * Lists all saved locations for a customer.
 */
export async function listSavedLocations(
  userId: string,
  db: Db = prisma,
): Promise<SavedLocation[]> {
  return await db.savedLocation.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Retrieves a single saved location by ID for a user.
 */
export async function getSavedLocationById(
  userId: string,
  id: string,
  db: Db = prisma,
): Promise<SavedLocation | null> {
  return await db.savedLocation.findFirst({
    where: { id, userId },
  });
}

/**
 * Creates a new saved location for a user, enforcing single-default location logic.
 */
export async function createSavedLocation(
  userId: string,
  input: CreateSavedLocationInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<SavedLocation> {
  validateCoordinates(input.latitude, input.longitude);

  return await dbClient.$transaction(async (tx) => {
    const existingLocations = await tx.savedLocation.findMany({
      where: { userId },
    });

    const isFirstLocation = existingLocations.length === 0;
    const shouldBeDefault = input.isDefault ?? isFirstLocation;

    if (shouldBeDefault) {
      await tx.savedLocation.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await tx.savedLocation.create({
      data: {
        userId,
        label: input.label,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        country: input.country ?? 'India',
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault) {
      await tx.customerProfile.upsert({
        where: { userId },
        create: { userId, defaultLocationId: created.id },
        update: { defaultLocationId: created.id },
      });
    }

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.location.created',
      entityType: 'SavedLocation',
      entityId: created.id,
      beforeState: null,
      afterState: { label: created.label, isDefault: created.isDefault },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.location.created',
      aggregateType: 'SavedLocation',
      aggregateId: created.id,
      payload: { userId, locationId: created.id, isDefault: created.isDefault },
    });

    return created;
  });
}

/**
 * Updates an existing saved location for a user.
 */
export async function updateSavedLocation(
  userId: string,
  id: string,
  input: UpdateSavedLocationInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<SavedLocation> {
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const lat = input.latitude ?? 0;
    const lon = input.longitude ?? 0;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      validateCoordinates(lat, lon);
    }
  }

  return await dbClient.$transaction(async (tx) => {
    const current = await tx.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!current) {
      throw new Error(`SavedLocation with ID ${id} not found.`);
    }

    if (input.isDefault === true) {
      await tx.savedLocation.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await tx.savedLocation.update({
      where: { id },
      data: {
        ...(input.label && { label: input.label }),
        ...(input.addressLine1 && { addressLine1: input.addressLine1 }),
        ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
        ...(input.city && { city: input.city }),
        ...(input.state && { state: input.state }),
        ...(input.country && { country: input.country }),
        ...(input.postalCode && { postalCode: input.postalCode }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });

    if (input.isDefault === true) {
      await tx.customerProfile.upsert({
        where: { userId },
        create: { userId, defaultLocationId: updated.id },
        update: { defaultLocationId: updated.id },
      });
    }

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.location.updated',
      entityType: 'SavedLocation',
      entityId: updated.id,
      beforeState: { label: current.label, isDefault: current.isDefault },
      afterState: { label: updated.label, isDefault: updated.isDefault },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.location.updated',
      aggregateType: 'SavedLocation',
      aggregateId: updated.id,
      payload: { userId, locationId: updated.id, isDefault: updated.isDefault },
    });

    return updated;
  });
}

/**
 * Sets a specific saved location as default, unsetting all other saved locations for the user.
 */
export async function setDefaultLocation(
  userId: string,
  locationId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<SavedLocation> {
  return await dbClient.$transaction(async (tx) => {
    const target = await tx.savedLocation.findFirst({
      where: { id: locationId, userId },
    });

    if (!target) {
      throw new Error(`SavedLocation with ID ${locationId} not found.`);
    }

    await tx.savedLocation.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await tx.savedLocation.update({
      where: { id: locationId },
      data: { isDefault: true },
    });

    await tx.customerProfile.upsert({
      where: { userId },
      create: { userId, defaultLocationId: updated.id },
      update: { defaultLocationId: updated.id },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.location.default_set',
      entityType: 'SavedLocation',
      entityId: updated.id,
      beforeState: { isDefault: target.isDefault },
      afterState: { isDefault: true },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.location.default_set',
      aggregateType: 'SavedLocation',
      aggregateId: updated.id,
      payload: { userId, locationId: updated.id },
    });

    return updated;
  });
}

/**
 * Deletes a saved location. If the deleted location was default, sets another location as default if available.
 */
export async function deleteSavedLocation(
  userId: string,
  id: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<void> {
  await dbClient.$transaction(async (tx) => {
    const target = await tx.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!target) {
      return;
    }

    await tx.savedLocation.delete({
      where: { id },
    });

    if (target.isDefault) {
      const nextLocation = await tx.savedLocation.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextLocation) {
        await tx.savedLocation.update({
          where: { id: nextLocation.id },
          data: { isDefault: true },
        });

        await tx.customerProfile.update({
          where: { userId },
          data: { defaultLocationId: nextLocation.id },
        });
      } else {
        await tx.customerProfile.update({
          where: { userId },
          data: { defaultLocationId: null },
        });
      }
    }

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.location.deleted',
      entityType: 'SavedLocation',
      entityId: id,
      beforeState: { label: target.label, isDefault: target.isDefault },
      afterState: null,
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.location.deleted',
      aggregateType: 'SavedLocation',
      aggregateId: id,
      payload: { userId, locationId: id },
    });
  });
}
