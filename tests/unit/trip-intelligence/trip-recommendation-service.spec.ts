import { TripRecommendationService } from '@/modules/trip-intelligence/trip-recommendation-service';

describe('TripRecommendationService Unit Tests', () => {
  const recommendationService = new TripRecommendationService();

  describe('Customer Recommendation Generation', () => {
    it('should build SHOW_MAP action card for DRIVER_EN_ROUTE with driver coordinates', () => {
      const actions = recommendationService.generateActions({
        role: 'CUSTOMER',
        signalType: 'DRIVER_EN_ROUTE',
        bookingId: 'b101',
        pickupAddress: 'Station Road, Vadodara',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        driverLatitude: 22.31,
        driverLongitude: 73.185,
        freshness: 'LIVE',
      });

      expect(actions.some((a) => a.type === 'SHOW_MAP')).toBe(true);
      const mapAction = actions.find((a) => a.type === 'SHOW_MAP');
      expect(mapAction?.payload.driverLatitude).toBe(22.31);
    });

    it('should build OPEN_INVOICE, OPEN_REVIEW, and PREFILL_BOOKING action cards for TRIP_COMPLETED', () => {
      const actions = recommendationService.generateActions({
        role: 'CUSTOMER',
        signalType: 'TRIP_COMPLETED',
        bookingId: 'b101',
        pickupAddress: 'Alkapuri, Vadodara',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        dropoffAddress: 'Gotri, Vadodara',
        finalFare: 450,
        earnedPoints: 45,
        freshness: 'UNAVAILABLE',
      });

      expect(actions.some((a) => a.type === 'OPEN_INVOICE')).toBe(true);
      expect(actions.some((a) => a.type === 'OPEN_REVIEW')).toBe(true);
      expect(actions.some((a) => a.type === 'PREFILL_BOOKING')).toBe(true);
    });

    it('should build CONTACT_SUPPORT action card when SAFETY_REQUIRED signal triggers', () => {
      const actions = recommendationService.generateActions({
        role: 'CUSTOMER',
        signalType: 'SAFETY_REQUIRED',
        bookingId: 'b101',
        pickupAddress: 'Vadodara',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        freshness: 'UNAVAILABLE',
      });

      expect(actions.some((a) => a.type === 'CONTACT_SUPPORT')).toBe(true);
    });
  });

  describe('Driver Recommendation Generation', () => {
    it('should build SHOW_MAP action card for pickup location', () => {
      const actions = recommendationService.generateActions({
        role: 'DRIVER',
        signalType: 'DRIVER_ASSIGNED',
        bookingId: 'b101',
        pickupAddress: 'Gotri, Vadodara',
        pickupLatitude: 22.308,
        pickupLongitude: 73.182,
        freshness: 'UNAVAILABLE',
      });

      expect(actions.some((a) => a.type === 'SHOW_MAP')).toBe(true);
      const mapAction = actions.find((a) => a.type === 'SHOW_MAP');
      expect(mapAction?.payload.pickupLatitude).toBe(22.308);
    });
  });
});
