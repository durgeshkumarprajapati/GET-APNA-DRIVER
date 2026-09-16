import 'server-only';
import { prisma } from '@/shared/database/prisma';
import { DriverAvailabilityStatus, DriverApprovalStatus } from '@prisma/client';
import { isDriverDispatchEligible } from '@/modules/driver/application/services/driver-eligibility-service';
import { resolveZoneForLocation, listMarketplaceZones } from './zone-service';

export interface SupplyMetricsSummary {
  totalDrivers: number;
  approvedDrivers: number;
  onlineDrivers: number;
  availableDrivers: number;
  busyDrivers: number;
  offlineDrivers: number;
  dispatchEligibleDrivers: number;
  supplyDemandRatio: number;
  supplyDemandRatioExplanation: string;
  zoneSupplyBreakdown: Array<{
    zoneId: string;
    zoneName: string;
    zoneCode: string;
    availableSupply: number;
    busySupply: number;
    eligibleSupply: number;
  }>;
}

/**
 * Calculates real driver supply metrics across active locations and dispatch eligibility.
 * Integrates directly with `isDriverDispatchEligible`.
 */
export async function getSupplyMetrics(
  zoneId?: string,
  vehicleCategory?: string,
  currentDemand: number = 0,
): Promise<SupplyMetricsSummary> {
  const [driverProfiles, currentLocations, activeZones] = await Promise.all([
    prisma.driverProfile.findMany({
      where: {
        approvalStatus: DriverApprovalStatus.APPROVED,
        ...(vehicleCategory ? { vehicleCategory } : {}),
      },
      select: {
        id: true,
        availabilityStatus: true,
        vehicleCategory: true,
      },
    }),
    prisma.driverCurrentLocation.findMany({
      select: {
        driverProfileId: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
      },
    }),
    listMarketplaceZones(),
  ]);

  const locationMap = new Map(
    currentLocations.map((loc) => [loc.driverProfileId, { lat: loc.latitude, lon: loc.longitude }]),
  );

  let onlineDrivers = 0;
  let availableDrivers = 0;
  let busyDrivers = 0;
  let offlineDrivers = 0;
  let dispatchEligibleDrivers = 0;

  const zoneSupplyMap: Record<
    string,
    { availableSupply: number; busySupply: number; eligibleSupply: number }
  > = {};

  for (const z of activeZones) {
    zoneSupplyMap[z.id] = { availableSupply: 0, busySupply: 0, eligibleSupply: 0 };
  }
  zoneSupplyMap['unzoned'] = { availableSupply: 0, busySupply: 0, eligibleSupply: 0 };

  const now = new Date();

  for (const driver of driverProfiles) {
    const loc = locationMap.get(driver.id);
    const zone = await resolveZoneForLocation(loc?.lat, loc?.lon);

    if (zoneId && zone.id !== zoneId) {
      continue;
    }

    const zEntry = zoneSupplyMap[zone.id] || {
      availableSupply: 0,
      busySupply: 0,
      eligibleSupply: 0,
    };

    if (driver.availabilityStatus === DriverAvailabilityStatus.AVAILABLE) {
      onlineDrivers++;
      availableDrivers++;
      zEntry.availableSupply++;

      // Check authorative dispatch eligibility
      const eligibility = await isDriverDispatchEligible(driver.id, now);
      if (eligibility.isEligible) {
        dispatchEligibleDrivers++;
        zEntry.eligibleSupply++;
      }
    } else if (driver.availabilityStatus === DriverAvailabilityStatus.BUSY) {
      onlineDrivers++;
      busyDrivers++;
      zEntry.busySupply++;
    } else {
      offlineDrivers++;
    }

    zoneSupplyMap[zone.id] = zEntry;
  }

  // Calculate supply-demand ratio: (available eligible supply / current demand)
  let supplyDemandRatio = 0;
  let supplyDemandRatioExplanation = '';

  if (currentDemand === 0) {
    supplyDemandRatio = dispatchEligibleDrivers > 0 ? 99.0 : 1.0;
    supplyDemandRatioExplanation = `Demand is zero. ${dispatchEligibleDrivers} eligible drivers available online.`;
  } else {
    supplyDemandRatio = Number((dispatchEligibleDrivers / currentDemand).toFixed(2));
    supplyDemandRatioExplanation = `${dispatchEligibleDrivers} dispatch-eligible drivers available for ${currentDemand} current active ride requests.`;
  }

  const zoneSupplyBreakdown = Object.entries(zoneSupplyMap)
    .map(([zId, data]) => {
      const matchZone = activeZones.find((z) => z.id === zId);
      return {
        zoneId: zId,
        zoneName: matchZone ? matchZone.name : 'Unzoned Area',
        zoneCode: matchZone ? matchZone.code : 'UNZONED',
        ...data,
      };
    })
    .filter((z) => !zoneId || z.zoneId === zoneId || z.availableSupply + z.busySupply > 0);

  return {
    totalDrivers: driverProfiles.length,
    approvedDrivers: driverProfiles.length,
    onlineDrivers,
    availableDrivers,
    busyDrivers,
    offlineDrivers,
    dispatchEligibleDrivers,
    supplyDemandRatio,
    supplyDemandRatioExplanation,
    zoneSupplyBreakdown,
  };
}
