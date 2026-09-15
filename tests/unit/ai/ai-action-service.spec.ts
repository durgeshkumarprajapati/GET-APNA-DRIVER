import { AIActionService } from '@/modules/ai/ai-action-service';

describe('AIActionService Unit Tests', () => {
  const actionService = new AIActionService();

  it('should validate valid PREFILL_BOOKING action', () => {
    const rawAction = {
      type: 'PREFILL_BOOKING',
      payload: {
        pickupAddress: 'Station',
        dropoffAddress: 'Airport',
        vehicleCategory: 'Sedan',
        estimatedPrice: 450,
      },
    };

    const validActions = actionService.validateActions([rawAction]);
    expect(validActions).toHaveLength(1);
    expect(validActions[0].type).toBe('PREFILL_BOOKING');
  });

  it('should reject invalid or malformed action payloads', () => {
    const malformedAction = {
      type: 'INVALID_TYPE',
      payload: { foo: 'bar' },
    };

    const validActions = actionService.validateActions([malformedAction]);
    expect(validActions).toHaveLength(0);
  });
});
