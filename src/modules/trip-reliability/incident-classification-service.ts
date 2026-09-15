import type { IncidentType, IncidentSeverity, IncidentConfidence } from './trip-reliability-types';

export class IncidentClassificationService {
  classifyIncident(type: IncidentType, activeSafetyIncident?: boolean): { severity: IncidentSeverity; confidence: IncidentConfidence } {
    if (activeSafetyIncident || type === 'SAFETY_ESCALATION') {
      return { severity: 'CRITICAL', confidence: 'HIGH' };
    }

    switch (type) {
      case 'DRIVER_CANCELLED':
      case 'DISPATCH_FAILURE':
      case 'SCHEDULED_RIDE_FAILURE':
      case 'PAYMENT_RECONCILIATION':
      case 'TRIP_STUCK':
        return { severity: 'HIGH', confidence: 'HIGH' };

      case 'ASSIGNMENT_TIMEOUT':
      case 'NO_DRIVER_AVAILABLE':
      case 'PICKUP_DELAY':
      case 'CUSTOMER_UNREACHABLE':
      case 'SUPPORT_ESCALATION':
        return { severity: 'MEDIUM', confidence: 'HIGH' };

      case 'DRIVER_LOCATION_STALE':
      case 'DRIVER_NOT_MOVING':
      case 'INVOICE_FAILURE':
      case 'NOTIFICATION_FAILURE':
      default:
        return { severity: 'LOW', confidence: 'MEDIUM' };
    }
  }
}
