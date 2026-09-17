import 'server-only';
import type { RouteProvider } from '../providers/route-provider';
import { GoogleRouteProvider } from '../providers/google-route-provider';
import { MapboxRouteProvider } from '../providers/mapbox-route-provider';
import { DeterministicRouteProvider } from '../providers/deterministic-route-provider';
import { getCachedETA, setCachedETA } from '../infrastructure/eta-cache';
import { recordETARequest } from '../infrastructure/location-telemetry';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

export class ETAService {
  private providers: RouteProvider[];

  constructor() {
    this.providers = [
      new GoogleRouteProvider(),
      new MapboxRouteProvider(),
      new DeterministicRouteProvider(),
    ];
  }

  async estimateETA(request: RouteEstimateRequest, bypassCache = false): Promise<ETAResult> {
    if (!bypassCache) {
      const cached = await getCachedETA(request);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();

    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (!available) continue;

      try {
        const result = await provider.estimateRoute(request);
        const latencyMs = Date.now() - startTime;
        recordETARequest(provider.providerName, true, latencyMs);

        // Cache result for 30s
        await setCachedETA(request, result, 30);
        return result;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        recordETARequest(provider.providerName, false, latencyMs);
        console.warn(`[ETAService] Provider ${provider.providerName} failed:`, err);
      }
    }

    // Fallback if all providers fail unexpectedly
    const fallbackProvider = new DeterministicRouteProvider();
    const result = await fallbackProvider.estimateRoute(request);
    await setCachedETA(request, result, 15);
    return result;
  }
}

export const defaultETAService = new ETAService();
