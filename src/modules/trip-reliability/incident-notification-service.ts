import { NotificationAdapter } from './adapters/notification-adapter';
import type { IncidentType, IncidentSeverity } from './trip-reliability-types';

export class IncidentNotificationService {
  private notificationAdapter = new NotificationAdapter();

  async notifyCustomerReliabilityEvent(
    customerId: string,
    bookingId: string,
    type: IncidentType,
    severity: IncidentSeverity,
  ) {
    let title = 'Trip Status Update';
    let message = 'We are actively monitoring your trip to ensure a seamless experience.';

    switch (type) {
      case 'DRIVER_CANCELLED':
      case 'ASSIGNMENT_TIMEOUT':
      case 'DISPATCH_FAILURE':
        title = 'Finding Your Driver';
        message =
          'Your driver is no longer available. We are automatically searching for another verified driver.';
        break;
      case 'DRIVER_LOCATION_STALE':
        title = 'Location Update Notice';
        message =
          "We haven't received a recent location update from your driver. Your trip remains active.";
        break;
      case 'PICKUP_DELAY':
        title = 'Driver Pickup Update';
        message = 'Your driver is experiencing a slight delay en route to your pickup location.';
        break;
      case 'SAFETY_ESCALATION':
        title = 'Safety Alert Priority';
        message = 'Our 24/7 Safety Command Center has received an alert for your trip.';
        break;
    }

    return this.notificationAdapter.sendReliabilityNotification({
      userId: customerId,
      title,
      message,
      category: 'RELIABILITY_ALERT',
      metadata: { bookingId, incidentType: type, severity },
    });
  }

  async notifyDriverReliabilityEvent(driverUserId: string, bookingId: string, type: IncidentType) {
    let title = 'Pickup Notice';
    let message = 'Please review your pickup route and navigation.';

    switch (type) {
      case 'CUSTOMER_UNREACHABLE':
        title = 'Customer Waiting Time';
        message =
          'You have arrived at the pickup spot. Try calling the customer via app proxy if needed.';
        break;
      case 'DRIVER_LOCATION_STALE':
        title = 'GPS Connection Check';
        message = 'Please ensure your location services are enabled for accurate navigation.';
        break;
    }

    return this.notificationAdapter.sendReliabilityNotification({
      userId: driverUserId,
      title,
      message,
      category: 'RELIABILITY_ALERT',
      metadata: { bookingId, incidentType: type },
    });
  }
}
