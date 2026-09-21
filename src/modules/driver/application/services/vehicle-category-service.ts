import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import type { VehicleCategory } from '@prisma/client';

export interface CreateVehicleCategoryInput {
  code: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateVehicleCategoryInput {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface DeleteVehicleCategoryResult {
  action: 'DELETED' | 'DEACTIVATED';
  message: string;
}

/**
 * Normalizes vehicle category code to uppercase with underscores.
 */
export function normalizeCategoryCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Lists vehicle categories ordered by displayOrder ASC, name ASC.
 */
export async function listVehicleCategories(
  activeOnly = false,
  db: Db = prisma,
): Promise<VehicleCategory[]> {
  return db.vehicleCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Gets a vehicle category by ID.
 */
export async function getVehicleCategoryById(
  id: string,
  db: Db = prisma,
): Promise<VehicleCategory | null> {
  return db.vehicleCategory.findUnique({ where: { id } });
}

/**
 * Gets a vehicle category by code.
 */
export async function getVehicleCategoryByCode(
  code: string,
  db: Db = prisma,
): Promise<VehicleCategory | null> {
  const normalizedCode = normalizeCategoryCode(code);
  return db.vehicleCategory.findUnique({ where: { code: normalizedCode } });
}

/**
 * Creates a new vehicle category. Admin only.
 */
export async function createVehicleCategory(
  actorUserId: string,
  input: CreateVehicleCategoryInput,
  db: Db = prisma,
): Promise<VehicleCategory> {
  const code = normalizeCategoryCode(input.code);
  if (!code || code.length < 2) {
    throw new Error('Vehicle category code must be at least 2 characters long.');
  }
  if (!input.name || input.name.trim().length < 2) {
    throw new Error('Vehicle category name must be at least 2 characters long.');
  }

  const existing = await db.vehicleCategory.findUnique({ where: { code } });
  if (existing) {
    throw new Error(`Vehicle category code '${code}' already exists.`);
  }

  const category = await db.vehicleCategory.create({
    data: {
      code,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      iconUrl: input.iconUrl?.trim() ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'vehicle_category.created',
    entityType: 'VehicleCategory',
    entityId: category.id,
    afterState: { code: category.code, name: category.name, isActive: category.isActive },
  });

  return category;
}

/**
 * Updates an existing vehicle category. Admin only.
 */
export async function updateVehicleCategory(
  actorUserId: string,
  id: string,
  input: UpdateVehicleCategoryInput,
  db: Db = prisma,
): Promise<VehicleCategory> {
  const existing = await db.vehicleCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Vehicle category with ID '${id}' not found.`);
  }

  if (input.name !== undefined && (!input.name || input.name.trim().length < 2)) {
    throw new Error('Vehicle category name must be at least 2 characters long.');
  }

  const updated = await db.vehicleCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() ?? null }),
      ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl?.trim() ?? null }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'vehicle_category.updated',
    entityType: 'VehicleCategory',
    entityId: id,
    beforeState: { name: existing.name, isActive: existing.isActive },
    afterState: { name: updated.name, isActive: updated.isActive },
  });

  return updated;
}

/**
 * Safely deletes or deactivates a vehicle category.
 * If referenced by any DriverVehicleCapability or Booking, deactivates instead of deleting.
 */
export async function deleteOrDeactivateVehicleCategory(
  actorUserId: string,
  id: string,
  db: Db = prisma,
): Promise<DeleteVehicleCategoryResult> {
  const category = await db.vehicleCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          driverCapabilities: true,
          bookings: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error(`Vehicle category with ID '${id}' not found.`);
  }

  const hasReferences = category._count.driverCapabilities > 0 || category._count.bookings > 0;

  if (hasReferences) {
    await db.vehicleCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog(db, {
      actorUserId,
      action: 'vehicle_category.deactivated',
      entityType: 'VehicleCategory',
      entityId: id,
      afterState: { isActive: false, reason: 'Category has existing capabilities or bookings' },
    });

    return {
      action: 'DEACTIVATED',
      message: `Category '${category.name}' has existing drivers or bookings referencing it; deactivated safely.`,
    };
  }

  await db.vehicleCategory.delete({ where: { id } });

  await recordAuditLog(db, {
    actorUserId,
    action: 'vehicle_category.deleted',
    entityType: 'VehicleCategory',
    entityId: id,
    beforeState: { code: category.code, name: category.name },
  });

  return {
    action: 'DELETED',
    message: `Category '${category.name}' deleted successfully.`,
  };
}
