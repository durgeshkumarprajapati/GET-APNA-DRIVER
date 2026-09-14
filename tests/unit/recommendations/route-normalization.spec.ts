import {
  normalizeCoordinate,
  calculateHaversineDistanceKm,
  buildRouteKey,
} from '@/modules/recommendations/utils/route-normalization';

describe('Route Normalization Unit Tests', () => {
  describe('normalizeCoordinate', () => {
    it('rounds coordinate to specified decimal places (default 3)', () => {
      expect(normalizeCoordinate(19.07609)).toBe(19.076);
      expect(normalizeCoordinate(72.877426)).toBe(72.877);
      expect(normalizeCoordinate(19.07609, 2)).toBe(19.08);
    });
  });

  describe('calculateHaversineDistanceKm', () => {
    it('calculates distance between Mumbai airport and Nariman Point correctly (~20km)', () => {
      const dist = calculateHaversineDistanceKm(19.0896, 72.8656, 18.9256, 72.8242);
      expect(dist).toBeGreaterThan(15);
      expect(dist).toBeLessThan(25);
    });

    it('returns 0 for identical coordinates', () => {
      const dist = calculateHaversineDistanceKm(19.076, 72.877, 19.076, 72.877);
      expect(dist).toBe(0);
    });
  });

  describe('buildRouteKey', () => {
    it('generates consistent deterministic hash key for route coordinates', () => {
      const key1 = buildRouteKey(19.076, 72.877, 19.205, 72.855);
      const key2 = buildRouteKey(19.07601, 72.87702, 19.20501, 72.85503);
      expect(key1).toBe(key2);
    });

    it('includes saved location ID if present', () => {
      const keySaved = buildRouteKey(19.076, 72.877, null, null, 'saved-123');
      expect(keySaved).toContain('saved:saved-123');
    });
  });
});
