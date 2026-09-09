import 'server-only';
import { ConfigValueType, type SystemConfiguration } from '@prisma/client';
import { prisma, type Db } from '../database/prisma';
import { redis } from '../redis/client';
import { recordAuditLog } from '../audit/audit-service';
import { insertOutboxEvent } from '../outbox/outbox-service';

const REDIS_CONFIG_PREFIX = 'config:';
const CACHE_TTL_SECONDS = 300;

export interface UpdateConfigurationInput {
  key: string;
  value: string;
  valueType?: ConfigValueType;
  description?: string | null;
  category?: string;
  isPublic?: boolean;
}

/**
 * Retrieves raw SystemConfiguration object by key, checking Redis cache first with DB fallback.
 */
export async function getConfiguration(
  key: string,
  db: Db = prisma,
): Promise<SystemConfiguration | null> {
  const cacheKey = `${REDIS_CONFIG_PREFIX}${key}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SystemConfiguration;
    }
  } catch {
    // Redis offline/error fallback
  }

  const config = db?.systemConfiguration?.findUnique
    ? await db.systemConfiguration.findUnique({
        where: { key },
      })
    : null;

  if (config) {
    try {
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(config));
    } catch {
      // Redis offline/error fallback
    }
  }

  return config;
}

/**
 * Reads a string configuration value or returns default.
 */
export async function getString(
  key: string,
  defaultValue: string,
  db: Db = prisma,
): Promise<string> {
  const config = await getConfiguration(key, db);
  return config ? config.value : defaultValue;
}

/**
 * Reads an integer configuration value or returns default.
 */
export async function getInteger(
  key: string,
  defaultValue: number,
  db: Db = prisma,
): Promise<number> {
  const config = await getConfiguration(key, db);
  if (!config) return defaultValue;
  const parsed = parseInt(config.value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Reads a decimal/float configuration value or returns default.
 */
export async function getDecimal(
  key: string,
  defaultValue: number,
  db: Db = prisma,
): Promise<number> {
  const config = await getConfiguration(key, db);
  if (!config) return defaultValue;
  const parsed = parseFloat(config.value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Reads a boolean configuration value or returns default.
 */
export async function getBoolean(
  key: string,
  defaultValue: boolean,
  db: Db = prisma,
): Promise<boolean> {
  const config = await getConfiguration(key, db);
  if (!config) return defaultValue;
  return config.value.toLowerCase() === 'true' || config.value === '1';
}

/**
 * Reads a JSON configuration value or returns default.
 */
export async function getJson<T>(key: string, defaultValue: T, db: Db = prisma): Promise<T> {
  const config = await getConfiguration(key, db);
  if (!config) return defaultValue;
  try {
    return JSON.parse(config.value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Admin operation to upsert a configuration entry, invalidate Redis cache, record audit log, and insert outbox event.
 */
export async function updateConfiguration(
  actorUserId: string | null,
  input: UpdateConfigurationInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<SystemConfiguration> {
  return await dbClient.$transaction(async (tx) => {
    const existing = await tx.systemConfiguration.findUnique({
      where: { key: input.key },
    });

    const updated = await tx.systemConfiguration.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        value: input.value,
        valueType: input.valueType ?? ConfigValueType.STRING,
        description: input.description ?? null,
        category: input.category ?? 'system',
        isPublic: input.isPublic ?? false,
        updatedBy: actorUserId,
      },
      update: {
        value: input.value,
        ...(input.valueType && { valueType: input.valueType }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
        updatedBy: actorUserId,
      },
    });

    // Invalidate Redis Cache
    try {
      await redis.del(`${REDIS_CONFIG_PREFIX}${input.key}`);
    } catch {
      // Redis error fallback
    }

    await recordAuditLog(tx, {
      actorUserId,
      action: 'system.configuration.updated',
      entityType: 'SystemConfiguration',
      entityId: updated.id,
      beforeState: existing ? { value: existing.value, isPublic: existing.isPublic } : null,
      afterState: { key: updated.key, value: updated.value, isPublic: updated.isPublic },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'system.configuration.updated',
      aggregateType: 'SystemConfiguration',
      aggregateId: updated.id,
      payload: { key: updated.key, value: updated.value, updatedBy: actorUserId },
    });

    return updated;
  });
}

/**
 * Lists configuration entries, optionally filtered by category or public visibility.
 */
export async function listConfigurations(
  category?: string,
  publicOnly: boolean = false,
  db: Db = prisma,
): Promise<SystemConfiguration[]> {
  return await db.systemConfiguration.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(publicOnly ? { isPublic: true } : {}),
    },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
}
