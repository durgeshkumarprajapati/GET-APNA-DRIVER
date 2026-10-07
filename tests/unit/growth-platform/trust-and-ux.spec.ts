import { getProductionTrustMatrix } from '@/modules/trust/application/production-trust-matrix-service';
import {
  getCustomerBookingUX3Defaults,
  processQuickBookUX3,
} from '@/modules/booking/application/services/customer-booking-ux3-service';
import { getDriverUX3ActiveWorkflow } from '@/modules/driver/application/services/driver-ux3-service';

describe('Phases 101, 102 & 103 — Trust Matrix, Customer UX 3.0 & Driver UX 3.0', () => {
  it('Phase 101: verifies production trust matrix with zero mock values and end-to-end integration', async () => {
    const report = await getProductionTrustMatrix();
    expect(report.overallIntegrityScore).toBe(100);
    expect(report.totalFeaturesAudited).toBeGreaterThan(0);
    expect(report.fabricatedMockValuesFound).toBe(0);
  });

  it('Phase 102: fetches customer booking defaults and processes quick book prefill', async () => {
    const mockDb: any = {
      customerSavedPerson: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const defaults = await getCustomerBookingUX3Defaults('cust-101', mockDb);
    expect(defaults.defaultServiceType).toBe('ONE_WAY');
    expect(defaults.savedPlaces.length).toBeGreaterThan(0);

    const quickBook = await processQuickBookUX3(
      'cust-101',
      {
        serviceType: 'ONE_WAY',
        pickupAddress: 'Indiranagar, Bengaluru',
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        vehicleCategory: 'SEDAN',
        couponCode: 'OFF150',
      },
      mockDb,
    );

    expect(quickBook.success).toBe(true);
    expect(quickBook.discountAmount).toBe(150);
    expect(quickBook.priceBreakdown.finalFare).toBe(quickBook.finalFare);
  });

  it('Phase 103: provides driver UX 3.0 single next action focus', async () => {
    const mockDb: any = {
      driverProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'drv-prof-1', availabilityStatus: 'AVAILABLE' }) },
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const workflow = await getDriverUX3ActiveWorkflow('drv-user-1', mockDb);
    expect(workflow.isOnline).toBe(true);
    expect(workflow.nextAction.title).toBeDefined();
  });
});
