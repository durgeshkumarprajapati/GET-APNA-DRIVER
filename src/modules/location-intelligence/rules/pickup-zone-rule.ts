import 'server-only';
import {
  resolveZoneForLocation,
  type ZoneSummary,
} from '@/modules/marketplace-intelligence/domain/zone-service';

export interface PickupZoneIntelligence {
  zone: ZoneSummary;
  isUnzoned: boolean;
  explanation: string;
}

export async function evaluatePickupZoneIntelligence(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Promise<PickupZoneIntelligence> {
  const zone = await resolveZoneForLocation(latitude, longitude);
  const isUnzoned = zone.code === 'UNZONED';

  return {
    zone,
    isUnzoned,
    explanation: isUnzoned
      ? 'Pickup point is outside designated high-density urban zones'
      : `Pickup point is within zone '${zone.name}' (${zone.code})`,
  };
}
