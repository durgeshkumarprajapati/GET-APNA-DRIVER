import 'server-only';
import type { RouteProvider } from './route-provider';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

export class MapboxRouteProvider implements RouteProvider {
  readonly providerName = 'MAPBOX' as const;

  private getAccessToken(): string | null {
    return process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || null;
  }

  async isAvailable(): Promise<boolean> {
    const token = this.getAccessToken();
    return Boolean(token && token !== 'mock-mapbox-token' && token.trim().length > 0);
  }

  async estimateRoute(request: RouteEstimateRequest): Promise<ETAResult> {
    const token = this.getAccessToken();
    if (!token || token === 'mock-mapbox-token') {
      throw new Error('Mapbox access token not configured or invalid');
    }

    const { origin, destination } = request;
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${token}&overview=simplified`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Mapbox Directions API error ${res.status}`);
      }

      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) {
        throw new Error(`Mapbox Directions API returned code ${data.code}`);
      }

      const route = data.routes[0];
      const distanceMeters = Math.round(route.distance);
      const durationSeconds = Math.round(route.duration);
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationMinutes = Math.ceil(durationSeconds / 60);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 1000);

      return {
        durationSeconds,
        durationMinutes,
        distanceMeters,
        distanceKm,
        provider: 'MAPBOX',
        confidence: 'HIGH',
        status: 'AVAILABLE',
        isEstimate: false,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        routeGeometry: route.geometry || null,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(
        `Mapbox route provider failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
