import 'server-only';
import { LocationSource, type CustomerCurrentLocation } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { validateCoordinates } from './distance-service';

export interface UpdateCustomerLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  address?: string | null;
  source?: LocationSource;
}

/**
 * Updates transient customer device/session current location without modifying saved addresses.
 */
export async function updateCustomerCurrentLocation(
  userId: string,
  input: UpdateCustomerLocationInput,
  db: Db = prisma,
): Promise<CustomerCurrentLocation> {
  validateCoordinates(input.latitude, input.longitude);

  return await db.customerCurrentLocation.upsert({
    where: { userId },
    create: {
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      address: input.address?.trim() || null,
      source: input.source || LocationSource.BROWSER_GPS,
    },
    update: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      address: input.address?.trim() || null,
      source: input.source || LocationSource.BROWSER_GPS,
    },
  });
}

/**
 * Retrieves customer current session location if available.
 */
export async function getCustomerCurrentLocation(
  userId: string,
  db: Db = prisma,
): Promise<CustomerCurrentLocation | null> {
  return await db.customerCurrentLocation.findUnique({
    where: { userId },
  });
}
