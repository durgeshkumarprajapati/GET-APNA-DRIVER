import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import type { DriverVehicleCapability, VehicleCategory } from '@prisma/client';

export type DriverCapabilityWithCategory = DriverVehicleCapability & {
  vehicleCategory: VehicleCategory;
};

/**
 * Retrieves declared vehicle capabilities for a driver.
 */
export async function getDriverVehicleCapabilities(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverCapabilityWithCategory[]> {
  return db.driverVehicleCapability.findMany({
    where: { driverProfileId },
    include: { vehicleCategory: true },
    orderBy: { vehicleCategory: { displayOrder: 'asc' } },
  });
}

/**
 * Checks if a driver possesses capability for a specific vehicle category ID.
 */
export async function hasDriverVehicleCapability(
  driverProfileId: string,
  vehicleCategoryId: string,
  db: Db = prisma,
): Promise<boolean> {
  const count = await db.driverVehicleCapability.count({
    where: {
      driverProfileId,
      vehicleCategoryId,
      vehicleCategory: { isActive: true },
    },
  });
  return count > 0;
}

/**
 * Updates vehicle capabilities for a driver profile.
 * Atomically validates category active status and replaces driver capability records.
 */
export async function setDriverVehicleCapabilities(
  driverProfileId: string,
  categoryIds: string[],
  actorUserId?: string | null,
  db: Db = prisma,
): Promise<DriverCapabilityWithCategory[]> {
  const driverProfile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: { id: true, userId: true },
  });

  if (!driverProfile) {
    throw new Error(`Driver profile with ID '${driverProfileId}' not found.`);
  }

  // Deduplicate input category IDs
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));

  if (uniqueCategoryIds.length > 0) {
    const activeCategories = await db.vehicleCategory.findMany({
      where: {
        id: { in: uniqueCategoryIds },
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });

    if (activeCategories.length !== uniqueCategoryIds.length) {
      const foundIds = new Set(activeCategories.map((c) => c.id));
      const invalidIds = uniqueCategoryIds.filter((id) => !foundIds.has(id));
      throw new Error(`Invalid or inactive vehicle category selection: ${invalidIds.join(', ')}`);
    }
  }

  return db.$transaction(async (tx) => {
    // 1. Fetch current capabilities for audit diff
    const currentCaps = await tx.driverVehicleCapability.findMany({
      where: { driverProfileId },
      select: { vehicleCategoryId: true },
    });
    const oldCategoryIds = currentCaps.map((c) => c.vehicleCategoryId);

    // 2. Clear existing capabilities
    await tx.driverVehicleCapability.deleteMany({
      where: { driverProfileId },
    });

    // 3. Re-create new capabilities
    if (uniqueCategoryIds.length > 0) {
      await tx.driverVehicleCapability.createMany({
        data: uniqueCategoryIds.map((vehicleCategoryId) => ({
          driverProfileId,
          vehicleCategoryId,
        })),
      });
    }

    // 4. Record audit log
    await recordAuditLog(tx, {
      actorUserId: actorUserId ?? driverProfile.userId,
      action: 'driver.capabilities.updated',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { vehicleCategoryIds: oldCategoryIds },
      afterState: { vehicleCategoryIds: uniqueCategoryIds },
    });

    // 5. Return updated list
    return tx.driverVehicleCapability.findMany({
      where: { driverProfileId },
      include: { vehicleCategory: true },
      orderBy: { vehicleCategory: { displayOrder: 'asc' } },
    });
  });
}
