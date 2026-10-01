jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

import { recordAuditLog } from '@/shared/audit/audit-service';
import {
  recordCustomerActivationEvent,
  isCustomerActivationEvent,
} from '@/modules/activation/application/activation-tracking-service';

const mockRecordAuditLog = recordAuditLog as jest.Mock;

describe('activation-tracking-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCustomerActivationEvent', () => {
    it('accepts a known event name', () => {
      expect(isCustomerActivationEvent('first_booking_flow_started')).toBe(true);
    });

    it('rejects an unknown string', () => {
      expect(isCustomerActivationEvent('drop_database')).toBe(false);
    });

    it('rejects non-string input', () => {
      expect(isCustomerActivationEvent(42)).toBe(false);
      expect(isCustomerActivationEvent(null)).toBe(false);
      expect(isCustomerActivationEvent(undefined)).toBe(false);
      expect(isCustomerActivationEvent({ event: 'first_booking_flow_started' })).toBe(false);
    });
  });

  describe('recordCustomerActivationEvent', () => {
    it('records an audit log entry namespaced under customer.activation', async () => {
      await recordCustomerActivationEvent('user-1', 'first_booking_flow_started');

      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorUserId: 'user-1',
          action: 'customer.activation.first_booking_flow_started',
          entityType: 'User',
          entityId: 'user-1',
        }),
      );
    });
  });
});
