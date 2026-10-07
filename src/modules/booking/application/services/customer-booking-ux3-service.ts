import 'server-only';
import type { BookingType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  CustomerBookingUX3DefaultsDTO,
  QuickBookUX3Input,
  QuickBookUX3ResponseDTO,
} from '../../domain/booking-ux-types';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { getMarketplaceZoneCoverage } from '@/modules/location/application/marketplace-zone-service';

/**
 * Phase 102 — Customer Booking UX 3.0 Service
 * Provides intelligent booking defaults, 1-screen quick booking prefill, price breakdown,
 * and driver ETA expectations.
 */
export async function getCustomerBookingUX3Defaults(
  customerId: string,
  db: Db = prisma,
): Promise<CustomerBookingUX3DefaultsDTO> {
  const [savedPeople, recentBookings, savedLocations] = await Promise.all([
    db.customerSavedPerson.findMany({
      where: { customerId, isActive: true },
      take: 5,
    }),
    db.booking.findMany({
      where: { customerId },
      include: { vehicleCategory: { select: { code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    // Real saved Home/Work/etc addresses — a prior version hardcoded three
    // fake places (with fake coordinates) regardless of what the customer
    // actually saved.
    db.savedLocation.findMany({
      where: { userId: customerId },
      orderBy: { isDefault: 'desc' },
    }),
  ]);

  const savedRecipients = savedPeople.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    relationship: p.relationship || 'Family',
  }));

  const recentShortcuts = recentBookings.map((b) => ({
    bookingId: b.id,
    serviceType: b.bookingType,
    pickupAddress: b.pickupAddress,
    dropoffAddress: b.dropoffAddress || 'Flexible Route',
    lastBookedDate: b.createdAt.toISOString(),
    vehicleCategory: b.vehicleCategory?.code ?? 'SEDAN',
    estimatedFare: Number(b.finalFareAmount || b.estimatedFareAmount || 0),
  }));

  // Most frequent vehicle category among recent bookings — a prior version
  // always returned 'SEDAN' regardless of booking history.
  const categoryFrequency = new Map<string, number>();
  for (const s of recentShortcuts) {
    categoryFrequency.set(s.vehicleCategory, (categoryFrequency.get(s.vehicleCategory) ?? 0) + 1);
  }
  let preferredVehicleCategory: CustomerBookingUX3DefaultsDTO['preferredVehicleCategory'] = 'SEDAN';
  let topCount = 0;
  for (const [category, count] of categoryFrequency) {
    if (
      count > topCount &&
      (category === 'HATCHBACK' ||
        category === 'SEDAN' ||
        category === 'SUV' ||
        category === 'LUXURY')
    ) {
      preferredVehicleCategory = category;
      topCount = count;
    }
  }

  return {
    defaultServiceType: 'ONE_WAY',
    defaultPickupAddress:
      recentBookings[0]?.pickupAddress ||
      [savedLocations[0]?.addressLine1, savedLocations[0]?.city].filter(Boolean).join(', ') ||
      'Current Location',
    defaultDropoffAddress: recentBookings[0]?.dropoffAddress ?? undefined,
    savedPlaces: savedLocations.map((loc) => ({
      name: loc.label,
      address: [loc.addressLine1, loc.addressLine2, loc.city].filter(Boolean).join(', '),
      lat: loc.latitude,
      lng: loc.longitude,
    })),
    savedRecipients,
    preferredVehicleCategory,
    recentShortcuts,
  };
}

/**
 * Computes a real quick-book price/ETA preview. There is no persisted draft
 * store anywhere in this service or the database — bookingDraftId is a
 * display-only reference, not something that can later be "confirmed" into
 * a real Booking row. A prior version also fabricated the entire price
 * breakdown as flat constants (baseFare 600/400, distanceFare always 350,
 * taxes always 42) and gave a flat ₹150 off for ANY coupon code, valid or
 * not. This now calls the same fare-calculation and coupon-validation
 * engines the real booking flow uses, so this preview can't disagree with
 * what actually happens when the customer completes the booking for real.
 */
export async function processQuickBookUX3(
  customerId: string,
  input: QuickBookUX3Input,
  db: Db = prisma,
): Promise<QuickBookUX3ResponseDTO> {
  let recipientName = 'Self';
  if (input.recipientId) {
    const person = await db.customerSavedPerson.findFirst({
      where: { id: input.recipientId, customerId },
    });
    if (person) recipientName = person.fullName;
  }

  const fareResult = await calculateEstimatedFare(
    {
      bookingType: input.serviceType as BookingType,
      pickup: { latitude: input.pickupLat, longitude: input.pickupLng },
      dropoff:
        input.dropoffLat !== undefined && input.dropoffLng !== undefined
          ? { latitude: input.dropoffLat, longitude: input.dropoffLng }
          : null,
    },
    db,
  );

  const estimatedFare = Math.round(Number(fareResult.breakdown.totalFareAmount));

  let discountAmount = 0;
  if (input.couponCode) {
    const preview = await validateCouponForPreview(
      { code: input.couponCode, fareAmount: estimatedFare.toString(), userId: customerId },
      db,
    );
    if (preview.valid) {
      discountAmount = Math.round(Number(preview.discountAmount));
    }
  }

  const finalFare = Math.max(0, estimatedFare - discountAmount);

  const coverage = await getMarketplaceZoneCoverage(input.pickupLat, input.pickupLng, db);
  const bookingDraftId = `ux3-draft-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    success: true,
    bookingDraftId,
    estimatedFare,
    discountAmount,
    finalFare,
    estimatedDriverEtaMins: coverage.estimatedDriverArrivalMins,
    priceBreakdown: {
      baseFare: Number(fareResult.breakdown.baseFareAmount),
      distanceFare: Number(fareResult.breakdown.distanceFareAmount),
      taxes: Number(fareResult.breakdown.platformFeeAmount),
      discount: discountAmount,
      finalFare,
    },
    summary: {
      serviceType: input.serviceType,
      routeText: `${input.pickupAddress} ➔ ${input.dropoffAddress || 'Flexible Route'}`,
      vehicleCategory: input.vehicleCategory,
      scheduledTime: input.scheduledTime || 'Immediate (Within 10 mins)',
      recipientName,
    },
    metrics: {
      avgStepsToBook: 2,
      estimatedBookingTimeSeconds: 12,
    },
  };
}
