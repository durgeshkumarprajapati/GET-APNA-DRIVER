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
    const errors: string[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (!available) continue;

      try {
        if (errors.length > 0) {
          console.info(`[ETAService] Attempting route estimation fallback using ${provider.providerName} provider...`);
        }

        const result = await provider.estimateRoute(request);
        const latencyMs = Date.now() - startTime;
        recordETARequest(provider.providerName, true, latencyMs);

        if (errors.length > 0) {
          console.info(`[ETAService] Successfully estimated ETA using fallback provider ${provider.providerName}.`);
        }

        // Cache result for 30s
        await setCachedETA(request, result, 30);
        return result;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        recordETARequest(provider.providerName, false, latencyMs);
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.providerName}: ${errMsg}`);
        console.warn(
          `[ETAService] Provider ${provider.providerName} failed (${errMsg}). Triggering fallback to next provider...`,
        );
      }
    }

    // Fallback if all configured providers fail unexpectedly
    console.warn(`[ETAService] All route providers failed (${errors.join('; ')}). Using DeterministicRouteProvider fallback.`);
    const fallbackProvider = new DeterministicRouteProvider();
    const result = await fallbackProvider.estimateRoute(request);
    await setCachedETA(request, result, 15);
    return result;
  }
}

export const defaultETAService = new ETAService();
