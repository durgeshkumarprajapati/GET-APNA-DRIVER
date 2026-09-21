import 'server-only';
import type { RouteProvider } from './route-provider';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

export class GoogleRouteProvider implements RouteProvider {
  readonly providerName = 'GOOGLE' as const;

  private getApiKey(): string | null {
    return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
  }

  async isAvailable(): Promise<boolean> {
    const key = this.getApiKey();
    return Boolean(key && key !== 'mock-google-maps-api-key' && key.trim().length > 0);
  }

  async estimateRoute(request: RouteEstimateRequest): Promise<ETAResult> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'mock-google-maps-api-key') {
      throw new Error('Google Maps API key not configured or invalid');
    }

    const { origin, destination } = request;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Google Directions API error ${res.status}`);
      }

      const data = await res.json();
      if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
        throw new Error(`Google Directions API returned status ${data.status}`);
      }

      const leg = data.routes[0].legs[0];
      const distanceMeters = leg.distance.value;
      const durationSeconds = leg.duration.value;
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationMinutes = Math.ceil(durationSeconds / 60);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 1000);

      return {
        durationSeconds,
        durationMinutes,
        distanceMeters,
        distanceKm,
        provider: 'GOOGLE',
        confidence: 'HIGH',
        status: 'AVAILABLE',
        isEstimate: false,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        routeGeometry: data.routes[0].overview_polyline?.points || null,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(
        `Google route provider failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
