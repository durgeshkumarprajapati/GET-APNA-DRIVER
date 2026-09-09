import 'server-only';
import { ThemePreference, type CustomerPreference } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

export interface UpdateCustomerPreferenceInput {
  theme?: ThemePreference;
  language?: string;
  pushNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
}

/**
 * Retrieves customer preference for a given user ID, creating a default preference if none exists.
 */
export async function getOrCreateCustomerPreference(
  userId: string,
  db: Db = prisma,
): Promise<CustomerPreference> {
  const existing = await db.customerPreference.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return await db.customerPreference.create({
    data: {
      userId,
      theme: ThemePreference.SYSTEM,
      language: 'en',
      pushNotificationsEnabled: true,
      smsNotificationsEnabled: true,
      emailNotificationsEnabled: true,
    },
  });
}

/**
 * Updates customer preferences within a database transaction, recording audit log and outbox event.
 */
export async function updateCustomerPreference(
  userId: string,
  input: UpdateCustomerPreferenceInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<CustomerPreference> {
  return await dbClient.$transaction(async (tx) => {
    const current = await getOrCreateCustomerPreference(userId, tx);

    const updated = await tx.customerPreference.update({
      where: { userId },
      data: {
        ...(input.theme && { theme: input.theme }),
        ...(input.language && { language: input.language }),
        ...(input.pushNotificationsEnabled !== undefined && {
          pushNotificationsEnabled: input.pushNotificationsEnabled,
        }),
        ...(input.smsNotificationsEnabled !== undefined && {
          smsNotificationsEnabled: input.smsNotificationsEnabled,
        }),
        ...(input.emailNotificationsEnabled !== undefined && {
          emailNotificationsEnabled: input.emailNotificationsEnabled,
        }),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.preference.updated',
      entityType: 'CustomerPreference',
      entityId: updated.id,
      beforeState: {
        theme: current.theme,
        language: current.language,
        push: current.pushNotificationsEnabled,
        sms: current.smsNotificationsEnabled,
        email: current.emailNotificationsEnabled,
      },
      afterState: {
        theme: updated.theme,
        language: updated.language,
        push: updated.pushNotificationsEnabled,
        sms: updated.smsNotificationsEnabled,
        email: updated.emailNotificationsEnabled,
      },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.preference.updated',
      aggregateType: 'CustomerPreference',
      aggregateId: updated.id,
      payload: { userId, preferenceId: updated.id },
    });

    return updated;
  });
}
