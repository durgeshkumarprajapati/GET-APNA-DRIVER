import { TripRiskService } from '@/modules/trip-intelligence/trip-risk-service';

describe('TripRiskService Unit Tests', () => {
  const riskService = new TripRiskService();

  describe('Confidence Evaluation', () => {
    it('should evaluate HIGH confidence when location freshness is LIVE', () => {
      const confidence = riskService.evaluateConfidence('LIVE', 'DRIVER_EN_ROUTE');
      expect(confidence).toBe('HIGH');
    });

    it('should evaluate MEDIUM confidence when location freshness is RECENT', () => {
      const confidence = riskService.evaluateConfidence('RECENT', 'DRIVER_EN_ROUTE');
      expect(confidence).toBe('MEDIUM');
    });

    it('should evaluate LOW confidence when location freshness is STALE or UNAVAILABLE', () => {
      const confidenceStale = riskService.evaluateConfidence('STALE', 'DRIVER_EN_ROUTE');
      const confidenceUnavail = riskService.evaluateConfidence('UNAVAILABLE', 'DRIVER_ASSIGNED');

      expect(confidenceStale).toBe('LOW');
      expect(confidenceUnavail).toBe('LOW');
    });

    it('should evaluate HIGH confidence for SAFETY_REQUIRED regardless of freshness', () => {
      const confidence = riskService.evaluateConfidence('UNAVAILABLE', 'SAFETY_REQUIRED');
      expect(confidence).toBe('HIGH');
    });
  });
});
