import 'server-only';
import type { Db } from '../database/prisma';

import type { Prisma } from '@prisma/client';

export interface RecordAuditLogInput {
  /** Null means system-initiated — not "unknown". */
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  requestMetadata?: Record<string, unknown> | null;
}

/**
 * Appends one audit record. Must be called with the same transaction client
 * (`tx`) used for the domain change it describes, so the audit trail can
 * never diverge from what actually happened.
 */
export async function recordAuditLog(db: Db, input: RecordAuditLogInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeState: (input.beforeState ?? undefined) as Prisma.InputJsonValue | undefined,
      afterState: (input.afterState ?? undefined) as Prisma.InputJsonValue | undefined,
      requestMetadata: (input.requestMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
