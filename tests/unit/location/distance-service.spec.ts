import {
  calculateHaversineDistance,
  toKmDisplay,
  validateCoordinates,
} from '@/modules/location/application/distance-service';
import { InvalidCoordinatesError } from '@/modules/location/domain/errors';

describe('DistanceService', () => {
  describe('validateCoordinates', () => {
    it('accepts valid latitude and longitude values', () => {
      expect(() => validateCoordinates(28.6139, 77.209)).not.toThrow();
      expect(() => validateCoordinates(-90, 180)).not.toThrow();
      expect(() => validateCoordinates(90, -180)).not.toThrow();
    });

    it('rejects latitude out of bounds', () => {
      expect(() => validateCoordinates(91, 77.209)).toThrow(InvalidCoordinatesError);
      expect(() => validateCoordinates(-90.1, 77.209)).toThrow(InvalidCoordinatesError);
    });

    it('rejects longitude out of bounds', () => {
      expect(() => validateCoordinates(28.6139, 180.1)).toThrow(InvalidCoordinatesError);
      expect(() => validateCoordinates(28.6139, -180.5)).toThrow(InvalidCoordinatesError);
    });

    it('rejects NaN or non-number coordinates', () => {
      expect(() => validateCoordinates(NaN, 77.209)).toThrow(InvalidCoordinatesError);
      expect(() => validateCoordinates(28.6139, NaN)).toThrow(InvalidCoordinatesError);
    });
  });

  describe('calculateHaversineDistance', () => {
    it('calculates distance between two known coordinate points accurately', () => {
      // New Delhi (28.6139, 77.2090) to Connaught Place (28.6315, 77.2167) ~ 2.1 km
      const distanceMeters = calculateHaversineDistance(28.6139, 77.209, 28.6315, 77.2167);
      expect(distanceMeters).toBeGreaterThan(1900);
      expect(distanceMeters).toBeLessThan(2300);
    });

    it('returns 0 for identical points', () => {
      const distance = calculateHaversineDistance(19.076, 72.8777, 19.076, 72.8777);
      expect(distance).toBe(0);
    });
  });

  describe('toKmDisplay', () => {
    it('formats meters under 1000m as meters', () => {
      expect(toKmDisplay(450)).toBe('450 m');
      expect(toKmDisplay(999)).toBe('999 m');
    });

    it('formats meters 1000m and above as kilometers with 1 decimal place', () => {
      expect(toKmDisplay(1500)).toBe('1.5 km');
      expect(toKmDisplay(5230)).toBe('5.2 km');
    });
  });
});
