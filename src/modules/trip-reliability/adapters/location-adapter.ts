import { getCustomerBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';

export class LocationAdapter {
  async getLatestTelemetry(userId: string, bookingId: string) {
    try {
      return await getCustomerBookingLocationTelemetry(userId, bookingId);
    } catch {
      return null;
    }
  }
}
