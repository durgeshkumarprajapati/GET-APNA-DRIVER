import { AIIntentService } from '@/modules/ai/ai-intent-service';

describe('AIIntentService Unit Tests', () => {
  const intentService = new AIIntentService();

  describe('Customer Intents', () => {
    it('should classify SOS emergency prompt correctly', () => {
      expect(intentService.classifyIntent('CUSTOMER', 'Emergency! I need help')).toBe(
        'EMERGENCY_SOS',
      );
      expect(intentService.classifyIntent('CUSTOMER', 'Driver is threatening me SOS')).toBe(
        'EMERGENCY_SOS',
      );
    });

    it('should classify booking prompt correctly', () => {
      expect(intentService.classifyIntent('CUSTOMER', 'Book a sedan for tomorrow morning')).toBe(
        'SCHEDULE_RIDE',
      );
      expect(intentService.classifyIntent('CUSTOMER', 'Book a cab to Vadodara Airport')).toBe(
        'BOOK_RIDE',
      );
      expect(intentService.classifyIntent('CUSTOMER', 'Book my usual ride')).toBe('REBOOK_RIDE');
    });

    it('should classify fare check prompt correctly', () => {
      expect(intentService.classifyIntent('CUSTOMER', 'How much would my ride cost?')).toBe(
        'CHECK_FARE',
      );
    });

    it('should classify discount check prompt correctly', () => {
      expect(
        intentService.classifyIntent('CUSTOMER', 'Do I have any promo coupons available?'),
      ).toBe('FIND_PROMOTION');
    });

    it('should classify loyalty prompt correctly', () => {
      expect(intentService.classifyIntent('CUSTOMER', 'How many rewards points do I have?')).toBe(
        'CHECK_LOYALTY',
      );
    });
  });

  describe('Driver Intents', () => {
    it('should classify briefing prompt correctly', () => {
      expect(intentService.classifyIntent('DRIVER', "Give me today's shift summary")).toBe(
        'SHIFT_SUMMARY',
      );
    });

    it('should classify earnings prompt correctly', () => {
      expect(intentService.classifyIntent('DRIVER', 'How much did I earn today?')).toBe(
        'EARNINGS_SUMMARY',
      );
    });

    it('should classify incentive prompt correctly', () => {
      expect(
        intentService.classifyIntent('DRIVER', 'How many rides do I need for my surge bonus?'),
      ).toBe('INCENTIVE_PROGRESS');
    });

    it('should classify customer pickup prompt correctly', () => {
      expect(intentService.classifyIntent('DRIVER', 'Show customer pickup location map')).toBe(
        'CUSTOMER_PICKUP',
      );
    });
  });
});
