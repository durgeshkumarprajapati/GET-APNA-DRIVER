import { BookingAdapter } from './adapters/booking-adapter';
import { LocationAdapter } from './adapters/location-adapter';
import { PaymentAdapter } from './adapters/payment-adapter';

export class IncidentContextService {
  private bookingAdapter = new BookingAdapter();
  private locationAdapter = new LocationAdapter();
  private paymentAdapter = new PaymentAdapter();

  async assembleContext(bookingId: string) {
    const booking = await this.bookingAdapter.getBookingForReliability(bookingId);
    if (!booking) return null;

    const telemetry = booking.customerId
      ? await this.locationAdapter.getLatestTelemetry(booking.customerId, bookingId)
      : null;

    const paymentState = await this.paymentAdapter.checkPaymentState(bookingId);

    return {
      booking,
      telemetry,
      paymentState,
    };
  }
}
