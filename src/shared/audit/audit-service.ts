import 'server-only';
import { prisma, type Db } from '../database/prisma';

import type { AuditLog, Prisma } from '@prisma/client';

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

export interface ListAuditLogsFilter {
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface ListAuditLogsResult {
  entries: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

const MAX_AUDIT_LOG_PAGE_SIZE = 100;
const DEFAULT_AUDIT_LOG_PAGE_SIZE = 25;

/**
 * Read-only, paginated audit trail query for admin viewers. Never mutates —
 * the audit log is append-only by design (see `recordAuditLog`).
 */
export async function listAuditLogs(
  filter: ListAuditLogsFilter = {},
  db: Db = prisma,
): Promise<ListAuditLogsResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize =
    filter.pageSize && filter.pageSize > 0
      ? Math.min(filter.pageSize, MAX_AUDIT_LOG_PAGE_SIZE)
      : DEFAULT_AUDIT_LOG_PAGE_SIZE;

  const where: Prisma.AuditLogWhereInput = {
    ...(filter.actorUserId ? { actorUserId: filter.actorUserId } : {}),
    ...(filter.entityType ? { entityType: filter.entityType } : {}),
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.fromDate || filter.toDate
      ? {
          createdAt: {
            ...(filter.fromDate ? { gte: filter.fromDate } : {}),
            ...(filter.toDate ? { lte: filter.toDate } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}
