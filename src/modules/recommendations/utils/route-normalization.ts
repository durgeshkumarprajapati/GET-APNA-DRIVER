/**
 * Normalizes latitude and longitude into a grid bucket (~110 meters precision at 3 decimal places)
 * to group geographically close pickup/dropoff points into canonical route keys.
 */
export function normalizeCoordinate(coord: number, precision = 3): number {
  const factor = Math.pow(10, precision);
  return Math.round(coord * factor) / factor;
}

/**
 * Generates a stable, deterministic route key for pickup and dropoff points.
 * Uses location labels/IDs if available, or normalized coordinates.
 */
export function buildRouteKey(
  pickupLat: number,
  pickupLng: number,
  dropoffLat?: number | null,
  dropoffLng?: number | null,
  savedLocationId?: string | null,
): string {
  const normPickup = `${normalizeCoordinate(pickupLat)},${normalizeCoordinate(pickupLng)}`;
  
  if (savedLocationId) {
    return `saved:${savedLocationId}`;
  }

  if (dropoffLat !== undefined && dropoffLat !== null && dropoffLng !== undefined && dropoffLng !== null) {
    const normDropoff = `${normalizeCoordinate(dropoffLat)},${normalizeCoordinate(dropoffLng)}`;
    return `route:${normPickup}->${normDropoff}`;
  }

  return `pickup:${normPickup}`;
}

/**
 * Calculates straight-line distance in kilometers between two lat/lng coordinates (Haversine formula).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
