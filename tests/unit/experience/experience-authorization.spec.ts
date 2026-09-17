import { validateAndProcessExperienceAction } from '@/modules/experience/application/experience-action-service';
import type { ExperienceActionType } from '@/modules/experience/domain/experience-types';

describe('Experience Authorization & Action Security', () => {
  it('validates customer experience action payloads', () => {
    const validAction = validateAndProcessExperienceAction({
      type: 'OPEN_BOOKING_PREFILLED',
      targetUrl: '/bookings/new',
      payload: { pickupAddress: 'Test Location' },
    });

    expect(validAction.isValid).toBe(true);
    expect(validAction.targetUrl).toBe('/bookings/new');
  });

  it('rejects invalid or unknown experience action types safely', () => {
    const invalidAction = validateAndProcessExperienceAction({
      type: 'UNKNOWN_ACTION' as unknown as ExperienceActionType,
    });

    expect(invalidAction.isValid).toBe(false);
    expect(invalidAction.targetUrl).toBe('/');
  });
});
