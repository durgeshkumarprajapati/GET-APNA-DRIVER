import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { normalizePhoneNumber } from '@/modules/identity/validation/phone';
import { type CustomerSavedPerson } from '@prisma/client';

export interface CreateSavedPersonInput {
  fullName: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  notes?: string | null;
  allowDuplicate?: boolean;
}

export interface UpdateSavedPersonInput {
  fullName?: string;
  phone?: string;
  email?: string | null;
  relationship?: string | null;
  notes?: string | null;
}

export interface SavedPersonResult {
  person: CustomerSavedPerson;
  isDuplicateWarning?: boolean;
}

/**
 * List all active saved people for a customer.
 */
export async function listSavedPeople(
  customerId: string,
  dbClient: Db = prisma,
): Promise<CustomerSavedPerson[]> {
  return await dbClient.customerSavedPerson.findMany({
    where: {
      customerId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a specific saved person enforcing customer ownership (IDOR protection).
 */
export async function getSavedPersonById(
  customerId: string,
  personId: string,
  dbClient: Db = prisma,
): Promise<CustomerSavedPerson | null> {
  const person = await dbClient.customerSavedPerson.findUnique({
    where: { id: personId },
  });

  if (!person || person.customerId !== customerId || !person.isActive) {
    return null;
  }

  return person;
}

/**
 * Create a new saved person for a customer with phone normalization and duplicate protection.
 */
export async function createSavedPerson(
  customerId: string,
  input: CreateSavedPersonInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<SavedPersonResult> {
  const normalizedPhone = normalizePhoneNumber(input.phone);
  const trimmedName = input.fullName.trim();

  // Check for duplicate active person by phone number for this customer
  const existingDuplicate = await dbClient.customerSavedPerson.findFirst({
    where: {
      customerId,
      phone: normalizedPhone,
      isActive: true,
    },
  });

  if (existingDuplicate && !input.allowDuplicate) {
    const error = new Error('A saved person with this mobile number already exists.');
    (error as unknown as Record<string, unknown>).isDuplicate = true;
    (error as unknown as Record<string, unknown>).existingPerson = existingDuplicate;
    throw error;
  }

  return await dbClient.$transaction(async (tx) => {
    const person = await tx.customerSavedPerson.create({
      data: {
        customerId,
        fullName: trimmedName,
        phone: normalizedPhone,
        email: input.email ? input.email.trim().toLowerCase() : null,
        relationship: input.relationship ? input.relationship.trim() : null,
        notes: input.notes ? input.notes.trim() : null,
        isActive: true,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: customerId,
      action: 'customer.saved_person.created',
      entityType: 'CustomerSavedPerson',
      entityId: person.id,
      afterState: {
        fullName: person.fullName,
        phone: person.phone,
        relationship: person.relationship,
      },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.saved_person.created',
      aggregateType: 'CustomerSavedPerson',
      aggregateId: person.id,
      payload: { customerId, personId: person.id },
    });

    return { person, isDuplicateWarning: !!existingDuplicate };
  });
}

/**
 * Update an existing saved person with strict customer ownership IDOR check.
 */
export async function updateSavedPerson(
  customerId: string,
  personId: string,
  input: UpdateSavedPersonInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<CustomerSavedPerson> {
  return await dbClient.$transaction(async (tx) => {
    const existing = await getSavedPersonById(customerId, personId, tx);
    if (!existing) {
      throw new Error('Saved person not found or unauthorized');
    }

    const normalizedPhone = input.phone ? normalizePhoneNumber(input.phone) : existing.phone;

    const updated = await tx.customerSavedPerson.update({
      where: { id: personId },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName.trim() }),
        ...(input.phone !== undefined && { phone: normalizedPhone }),
        ...(input.email !== undefined && {
          email: input.email ? input.email.trim().toLowerCase() : null,
        }),
        ...(input.relationship !== undefined && {
          relationship: input.relationship ? input.relationship.trim() : null,
        }),
        ...(input.notes !== undefined && {
          notes: input.notes ? input.notes.trim() : null,
        }),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: customerId,
      action: 'customer.saved_person.updated',
      entityType: 'CustomerSavedPerson',
      entityId: updated.id,
      beforeState: {
        fullName: existing.fullName,
        phone: existing.phone,
        relationship: existing.relationship,
      },
      afterState: {
        fullName: updated.fullName,
        phone: updated.phone,
        relationship: updated.relationship,
      },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.saved_person.updated',
      aggregateType: 'CustomerSavedPerson',
      aggregateId: updated.id,
      payload: { customerId, personId: updated.id },
    });

    return updated;
  });
}

/**
 * Soft delete (deactivate) a saved person with strict customer ownership IDOR check.
 */
export async function deleteSavedPerson(
  customerId: string,
  personId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<{ success: boolean }> {
  return await dbClient.$transaction(async (tx) => {
    const existing = await getSavedPersonById(customerId, personId, tx);
    if (!existing) {
      throw new Error('Saved person not found or unauthorized');
    }

    await tx.customerSavedPerson.update({
      where: { id: personId },
      data: { isActive: false },
    });

    await recordAuditLog(tx, {
      actorUserId: customerId,
      action: 'customer.saved_person.deleted',
      entityType: 'CustomerSavedPerson',
      entityId: personId,
      beforeState: { fullName: existing.fullName, phone: existing.phone },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.saved_person.deleted',
      aggregateType: 'CustomerSavedPerson',
      aggregateId: personId,
      payload: { customerId, personId },
    });

    return { success: true };
  });
}
