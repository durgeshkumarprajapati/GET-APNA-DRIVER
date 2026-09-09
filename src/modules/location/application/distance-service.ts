import 'server-only';
import { InvalidCoordinatesError } from '../domain/errors';

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters

/**
 * Validates that latitude and longitude are within standard WGS84 boundaries.
 */
export function validateCoordinates(latitude: number, longitude: number): void {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new InvalidCoordinatesError(latitude, longitude);
  }
}

/**
 * Calculates geodesic distance between two coordinate pairs using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  validateCoordinates(lat1, lon1);
  validateCoordinates(lat2, lon2);

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Converts distance in meters to kilometers formatted to 1 decimal place.
 */
export function toKmDisplay(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
