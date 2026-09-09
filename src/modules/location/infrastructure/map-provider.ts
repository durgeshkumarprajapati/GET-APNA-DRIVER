import 'server-only';

export interface GeocodeResult {
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface DistanceMatrixResult {
  distanceMeters: number;
  durationSeconds: number;
}

export interface MapProvider {
  geocode(address: string): Promise<GeocodeResult[]>;
  reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult>;
  calculateDistance(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<DistanceMatrixResult>;
}

/**
 * Mock development implementation of MapProvider for testing and local development.
 */
export class DevelopmentMapProvider implements MapProvider {
  async geocode(address: string): Promise<GeocodeResult[]> {
    return [
      {
        addressLine1: address,
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        formattedAddress: `${address}, Bengaluru, Karnataka 560001, India`,
      },
    ];
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
    return {
      addressLine1: 'MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560038',
      latitude,
      longitude,
      formattedAddress: `MG Road, Indiranagar, Bengaluru, Karnataka 560038, India`,
    };
  }

  async calculateDistance(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<DistanceMatrixResult> {
    // Haversine formula approximation in development
    const R = 6371000; // earth radius in meters
    const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((destination.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c);
    const durationSeconds = Math.round(distanceMeters / 8.33); // assume ~30 km/h average speed in city

    return {
      distanceMeters,
      durationSeconds,
    };
  }
}

export const mapProvider: MapProvider = new DevelopmentMapProvider();
