import type {
  MapProviderType,
  MapProviderStatus,
  MapCapabilities,
  MapTelemetryEvent,
} from '../domain/map-types';

export class MapProviderManager {
  private static activeProvider: MapProviderType = 'google';
  private static providerStatuses: Record<MapProviderType, MapProviderStatus> = {
    google: 'available',
    mapbox: 'available',
    fallback: 'available',
  };
  private static failureCounts: Record<MapProviderType, number> = {
    google: 0,
    mapbox: 0,
    fallback: 0,
  };
  private static telemetryLog: MapTelemetryEvent[] = [];

  /**
   * Returns the current active provider based on deterministic fallback hierarchy.
   */
  public static getActiveProvider(): MapProviderType {
    if (this.providerStatuses.google !== 'failed' && this.failureCounts.google === 0) {
      this.activeProvider = 'google';
      return this.activeProvider;
    }
    if (this.providerStatuses.mapbox !== 'failed' && this.failureCounts.mapbox === 0) {
      this.activeProvider = 'mapbox';
      return this.activeProvider;
    }
    this.activeProvider = 'fallback';
    return this.activeProvider;
  }

  /**
   * Returns capability descriptors for the specified provider.
   */
  public static getCapabilities(provider: MapProviderType): MapCapabilities {
    switch (provider) {
      case 'google':
        return {
          supportsAdvancedMarkers: true,
          supportsCustomStyles: true,
          supportsSmoothHeading: true,
          supportsTileClustering: true,
        };
      case 'mapbox':
        return {
          supportsAdvancedMarkers: true,
          supportsCustomStyles: true,
          supportsSmoothHeading: true,
          supportsTileClustering: true,
        };
      case 'fallback':
      default:
        return {
          supportsAdvancedMarkers: false,
          supportsCustomStyles: false,
          supportsSmoothHeading: false,
          supportsTileClustering: false,
        };
    }
  }

  /**
   * Reports a provider initialization or rendering failure and triggers deterministic fallback.
   */
  public static reportProviderFailure(provider: MapProviderType, reason: string): MapProviderType {
    this.failureCounts[provider] += 1;
    this.providerStatuses[provider] = 'failed';

    this.recordTelemetry({
      provider,
      status: 'failed',
      errorCategory: reason,
      timestamp: new Date().toISOString(),
    });

    const nextProvider = this.getActiveProvider();
    this.activeProvider = nextProvider;

    const fallbackMsg =
      nextProvider === 'mapbox'
        ? 'Now using Mapbox GL JS map provider.'
        : nextProvider === 'fallback'
          ? 'Now using Location Textual Details fallback provider.'
          : '';

    console.warn(
      `[MapProviderManager] Provider '${provider}' failed (${reason}). Failover triggered. ${fallbackMsg}`,
    );

    return nextProvider;
  }

  /**
   * Reports successful provider initialization.
   */
  public static reportProviderSuccess(provider: MapProviderType, latencyMs?: number): void {
    this.providerStatuses[provider] = 'available';

    this.recordTelemetry({
      provider,
      status: 'available',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Returns status for a given provider.
   */
  public static getProviderStatus(provider: MapProviderType): MapProviderStatus {
    return this.providerStatuses[provider];
  }

  /**
   * Returns telemetry history for observability.
   */
  public static getTelemetryEvents(): MapTelemetryEvent[] {
    return [...this.telemetryLog];
  }

  /**
   * Records telemetry event safely.
   */
  private static recordTelemetry(event: MapTelemetryEvent): void {
    this.telemetryLog.push(event);
    if (this.telemetryLog.length > 100) {
      this.telemetryLog.shift();
    }
  }

  /**
   * Resets provider manager state for testing.
   */
  public static resetForTest(): void {
    this.activeProvider = 'google';
    this.providerStatuses = {
      google: 'available',
      mapbox: 'available',
      fallback: 'available',
    };
    this.failureCounts = {
      google: 0,
      mapbox: 0,
      fallback: 0,
    };
    this.telemetryLog = [];
  }
}
