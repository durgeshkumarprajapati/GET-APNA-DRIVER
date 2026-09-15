import type { IncidentType } from './trip-reliability-types';

export interface IncidentPolicy {
  canAutoRecover: boolean;
  maxAutoRetries: number;
  strategy: 'RESTART_DISPATCH' | 'IDEMPOTENT_RETRY' | 'ESCALATE_ONLY' | 'NOTIFY_ONLY';
}

export class IncidentPolicyService {
  getPolicyForIncidentType(type: IncidentType): IncidentPolicy {
    switch (type) {
      case 'ASSIGNMENT_TIMEOUT':
      case 'DISPATCH_FAILURE':
      case 'DRIVER_CANCELLED':
      case 'SCHEDULED_RIDE_FAILURE':
        return {
          canAutoRecover: true,
          maxAutoRetries: 3,
          strategy: 'RESTART_DISPATCH',
        };

      case 'INVOICE_FAILURE':
      case 'NOTIFICATION_FAILURE':
        return {
          canAutoRecover: true,
          maxAutoRetries: 3,
          strategy: 'IDEMPOTENT_RETRY',
        };

      case 'SAFETY_ESCALATION':
      case 'SUPPORT_ESCALATION':
      case 'PAYMENT_RECONCILIATION':
      case 'TRIP_STUCK':
        return {
          canAutoRecover: false,
          maxAutoRetries: 0,
          strategy: 'ESCALATE_ONLY',
        };

      case 'DRIVER_LOCATION_STALE':
      case 'DRIVER_NOT_MOVING':
      case 'PICKUP_DELAY':
      case 'CUSTOMER_UNREACHABLE':
      case 'NO_DRIVER_AVAILABLE':
      default:
        return {
          canAutoRecover: false,
          maxAutoRetries: 1,
          strategy: 'NOTIFY_ONLY',
        };
    }
  }
}
