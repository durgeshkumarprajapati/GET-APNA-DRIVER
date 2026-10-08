import type { Db } from '@/shared/database/prisma';
import { getProductionTrustMatrix } from '@/modules/trust/application/production-trust-matrix-service';
import {
  getCustomerBookingUX3Defaults,
  processQuickBookUX3,
} from '@/modules/booking/application/services/customer-booking-ux3-service';
import { getDriverUX3ActiveWorkflow } from '@/modules/driver/application/services/driver-ux3-service';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { getMarketplaceZoneCoverage } from '@/modules/location/application/marketplace-zone-service';
import {
  getDriverShiftSummary,
  getDriverEarningsBreakdown,
  getDriverPerformanceInsights,
} from '@/modules/driver/application/services/driver-experience-insights-service';

jest.mock('@/modules/pricing/application/fare-calculation-service', () => ({
  calculateEstimatedFare: jest.fn(),
}));
jest.mock('@/modules/promotion/application/services/promotion-eligibility-service', () => ({
  validateCouponForPreview: jest.fn(),
}));
jest.mock('@/modules/location/application/marketplace-zone-service', () => ({
  getMarketplaceZoneCoverage: jest.fn(),
}));
jest.mock('@/modules/driver/application/services/driver-experience-insights-service', () => ({
  getDriverShiftSummary: jest.fn(),
  getDriverEarningsBreakdown: jest.fn(),
  getDriverPerformanceInsights: jest.fn(),
}));

const mockCalculateEstimatedFare = calculateEstimatedFare as jest.Mock;
const mockValidateCouponForPreview = validateCouponForPreview as jest.Mock;
const mockGetMarketplaceZoneCoverage = getMarketplaceZoneCoverage as jest.Mock;
const mockGetDriverShiftSummary = getDriverShiftSummary as jest.Mock;
const mockGetDriverEarningsBreakdown = getDriverEarningsBreakdown as jest.Mock;
const mockGetDriverPerformanceInsights = getDriverPerformanceInsights as jest.Mock;

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phases 101, 102 & 103 — Trust Matrix, Customer UX 3.0 & Driver UX 3.0', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phase 101 — Production Trust Matrix', () => {
    it('derives summary counts from the matrix entries instead of asserting a hardcoded score', async () => {
      const report = await getProductionTrustMatrix();

      expect(report.totalFeaturesAudited).toBe(report.matrix.length);
      expect(report.verifiedEndToEndCount).toBe(
        report.matrix.filter((m) => m.realResultStatus === 'VERIFIED_END_TO_END').length,
      );
      expect(report.overallIntegrityScore).toBe(
        Math.round((report.verifiedEndToEndCount / report.matrix.length) * 100),
      );
    });

    it('never claims a UI component exists for a feature with no real UI consumer', async () => {
      const report = await getProductionTrustMatrix();

      const noUiFeature = report.matrix.find((m) => m.featureId === 'feat-ai-concierge2');
      expect(noUiFeature?.uiComponent).toContain('backend only');
      expect(noUiFeature?.realResultStatus).toBe('UNSUPPORTED_EXPLICIT_NOTICE');
    });
  });

  describe('Phase 102 — Customer Booking UX 3.0', () => {
    it('builds defaults from real saved locations and recent bookings, never fabricated places', async () => {
      const mockDb: MockDb = {
        customerSavedPerson: {
          findMany: jest.fn().mockResolvedValue([]),
        } as unknown as Db['customerSavedPerson'],
        booking: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
        savedLocation: {
          findMany: jest.fn().mockResolvedValue([
            {
              label: 'Home',
              addressLine1: '12 MG Road',
              addressLine2: null,
              city: 'Bengaluru',
              latitude: 12.9716,
              longitude: 77.5946,
              isDefault: true,
            },
          ]),
        } as unknown as Db['savedLocation'],
      };

      const defaults = await getCustomerBookingUX3Defaults('cust-101', mockDb as Db);

      expect(defaults.defaultServiceType).toBe('ONE_WAY');
      expect(defaults.savedPlaces).toEqual([
        { name: 'Home', address: '12 MG Road, Bengaluru', lat: 12.9716, lng: 77.5946 },
      ]);
    });

    it('computes quick-book pricing and discount from the real fare and coupon engines, never flat fabricated constants', async () => {
      mockCalculateEstimatedFare.mockResolvedValue({
        estimatedDistanceKm: 10,
        estimatedDurationMinutes: 20,
        breakdown: {
          baseFareAmount: '100.0000',
          distanceFareAmount: '150.0000',
          durationFareAmount: '0.0000',
          packageAdjustmentAmount: '0.0000',
          minimumFareAmount: '150.0000',
          platformFeeAmount: '25.0000',
          subtotalAmount: '275.0000',
          totalFareAmount: '275.0000',
        },
        rates: {} as never,
        routeProvider: 'deterministic',
      });
      mockValidateCouponForPreview.mockResolvedValue({
        valid: true,
        errorCode: null,
        errorMessage: null,
        discountAmount: '50.0000',
        finalFare: '225.0000',
      });
      mockGetMarketplaceZoneCoverage.mockResolvedValue({ estimatedDriverArrivalMins: 7 });

      const mockDb: MockDb = {
        customerSavedPerson: {
          findFirst: jest.fn().mockResolvedValue(null),
        } as unknown as Db['customerSavedPerson'],
      };

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
        mockDb as Db,
      );

      expect(mockCalculateEstimatedFare).toHaveBeenCalled();
      expect(mockValidateCouponForPreview).toHaveBeenCalledWith(
        { code: 'OFF150', fareAmount: '275', userId: 'cust-101' },
        mockDb,
      );
      expect(quickBook.success).toBe(true);
      expect(quickBook.estimatedFare).toBe(275);
      expect(quickBook.discountAmount).toBe(50);
      expect(quickBook.finalFare).toBe(225);
      expect(quickBook.estimatedDriverEtaMins).toBe(7);
      expect(quickBook.priceBreakdown.finalFare).toBe(quickBook.finalFare);
    });

    it('never applies a discount for a coupon the real engine rejects', async () => {
      mockCalculateEstimatedFare.mockResolvedValue({
        breakdown: {
          baseFareAmount: '100.0000',
          distanceFareAmount: '150.0000',
          platformFeeAmount: '25.0000',
          totalFareAmount: '275.0000',
        },
      });
      mockValidateCouponForPreview.mockResolvedValue({
        valid: false,
        errorCode: 'COUPON_NOT_FOUND',
        errorMessage: "Coupon code 'GARBAGE' not found.",
      });
      mockGetMarketplaceZoneCoverage.mockResolvedValue({ estimatedDriverArrivalMins: 5 });

      const quickBook = await processQuickBookUX3(
        'cust-101',
        {
          serviceType: 'ONE_WAY',
          pickupAddress: 'Indiranagar, Bengaluru',
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          vehicleCategory: 'SEDAN',
          couponCode: 'GARBAGE',
        },
        {} as Db,
      );

      expect(quickBook.discountAmount).toBe(0);
      expect(quickBook.finalFare).toBe(275);
    });
  });

  describe('Phase 103 — Driver UX 3.0', () => {
    it('provides single next-action focus using real earnings/performance data, not hardcoded constants', async () => {
      mockGetDriverShiftSummary.mockResolvedValue({ activeShiftDurationMinutes: 120 });
      mockGetDriverEarningsBreakdown.mockResolvedValue({
        completedTripsToday: 3,
        todayNetEarnings: '450.00',
      });
      mockGetDriverPerformanceInsights.mockResolvedValue({
        acceptanceRatePercentage: 88,
        averageRating: 4.7,
      });

      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 'drv-prof-1',
              availabilityStatus: 'AVAILABLE',
              currentLocation: null,
            }),
        } as unknown as Db['driverProfile'],
        booking: { findFirst: jest.fn().mockResolvedValue(null) } as unknown as Db['booking'],
      };

      const workflow = await getDriverUX3ActiveWorkflow('drv-user-1', mockDb as Db);

      expect(workflow.isOnline).toBe(true);
      expect(workflow.nextAction.title).toBeDefined();
      expect(workflow.todaysBookingsCompleted).toBe(3);
      expect(workflow.todaysEarningsAmount).toBe(450);
      expect(workflow.acceptanceRatePercent).toBe(88);
      expect(workflow.rating).toBe(4.7);
      expect(workflow.todaysOnlineHours).toBe(2);
    });

    it('reports zero stats honestly when the driver profile does not resolve, rather than fabricated fallbacks', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue(null),
        } as unknown as Db['driverProfile'],
      };

      const workflow = await getDriverUX3ActiveWorkflow('drv-user-missing', mockDb as Db);

      expect(workflow.isOnline).toBe(false);
      expect(workflow.todaysEarningsAmount).toBe(0);
      expect(workflow.rating).toBe(0);
      expect(mockGetDriverShiftSummary).not.toHaveBeenCalled();
    });
  });
});
