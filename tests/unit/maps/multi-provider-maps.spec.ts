import { MapProviderManager } from '@/modules/maps/application/map-provider-manager';
import {
  loadMapboxScript,
  resetMapboxLoaderForTest,
} from '@/modules/maps/infrastructure/mapbox-loader';

describe('Phase 53 — Multi-Provider Maps & Failover Tests', () => {
  beforeEach(() => {
    MapProviderManager.resetForTest();
    resetMapboxLoaderForTest();
  });

  describe('MapProviderManager', () => {
    it('should default to Google Maps as primary provider', () => {
      expect(MapProviderManager.getActiveProvider()).toBe('google');
    });

    it('should failover to Mapbox when Google Maps fails', () => {
      const nextProvider = MapProviderManager.reportProviderFailure(
        'google',
        'Google Maps API key invalid',
      );
      expect(nextProvider).toBe('mapbox');
      expect(MapProviderManager.getActiveProvider()).toBe('mapbox');
      expect(MapProviderManager.getProviderStatus('google')).toBe('failed');
    });

    it('should failover to textual location summary when both Google and Mapbox fail', () => {
      MapProviderManager.reportProviderFailure('google', 'Script load error');
      const finalProvider = MapProviderManager.reportProviderFailure(
        'mapbox',
        'Access token invalid',
      );

      expect(finalProvider).toBe('fallback');
      expect(MapProviderManager.getActiveProvider()).toBe('fallback');
    });

    it('should record telemetry events upon failure and success', () => {
      MapProviderManager.reportProviderFailure('google', 'Timeout');
      MapProviderManager.reportProviderSuccess('mapbox', 45);

      const events = MapProviderManager.getTelemetryEvents();
      expect(events.length).toBe(2);
      expect(events[0].provider).toBe('google');
      expect(events[0].status).toBe('failed');
      expect(events[1].provider).toBe('mapbox');
      expect(events[1].status).toBe('available');
    });

    it('should return correct capabilities for each provider', () => {
      const googleCaps = MapProviderManager.getCapabilities('google');
      expect(googleCaps.supportsAdvancedMarkers).toBe(true);

      const fallbackCaps = MapProviderManager.getCapabilities('fallback');
      expect(fallbackCaps.supportsAdvancedMarkers).toBe(false);
    });
  });

  describe('Mapbox Loader Infrastructure', () => {
    it('should reject when running on server side', async () => {
      const originalWindow = global.window;
      // @ts-expect-error Mocking server-side environment
      delete global.window;

      await expect(loadMapboxScript('test_token')).rejects.toThrow(
        'Mapbox script cannot be loaded on the server.',
      );

      global.window = originalWindow;
    });

    it('should reject if access token is missing', async () => {
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const originalWindow = global.window;
      // @ts-expect-error Mocking browser window
      global.window = {};

      await expect(loadMapboxScript()).rejects.toThrow(
        'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing.',
      );

      global.window = originalWindow;
    });
  });
});
