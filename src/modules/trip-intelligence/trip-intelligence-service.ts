import type { TripIntelligenceResult } from './trip-intelligence-types';
import { getTripIntelligenceConfig } from './trip-intelligence-config';
import { CustomerTripIntelligence } from './customer/customer-trip-intelligence';
import { DriverTripIntelligence } from './driver/driver-trip-intelligence';

export class TripIntelligenceService {
  private customerIntelligence = new CustomerTripIntelligence();
  private driverIntelligence = new DriverTripIntelligence();

  async getTripIntelligence(
    userId: string,
    bookingId: string,
    role: 'CUSTOMER' | 'DRIVER'
  ): Promise<TripIntelligenceResult | null> {
    const config = getTripIntelligenceConfig();

    if (!config.enabled || (role === 'CUSTOMER' && !config.customerEnabled) || (role === 'DRIVER' && !config.driverEnabled)) {
      return null;
    }

    if (role === 'CUSTOMER') {
      return this.customerIntelligence.getCustomerTripIntelligence(userId, bookingId);
    } else {
      return this.driverIntelligence.getDriverTripIntelligence(userId, bookingId);
    }
  }
}
