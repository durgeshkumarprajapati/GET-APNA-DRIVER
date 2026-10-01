import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import type { BookingType } from '@prisma/client';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';

export interface LocationDetail {
  address: string;
  label?: string | null;
  latitude: number;
  longitude: number;
}

export interface SmartBookingDefaults {
  pickupLocation: LocationDetail | null;
  dropoffLocation: LocationDetail | null;
  bookingType: BookingType;
  vehicleCategory: string;
  paymentMethod: string;
  savedPersonId?: string | null;
  savedPersonName?: string | null;
  preferredDriverId?: string | null;
  preferredDriverName?: string | null;
  hasPreviousBookings: boolean;
}

export interface QuickRebookCard {
  id: string;
  title: string;
  subtitle: string;
  bookingType: BookingType;
  pickupLocation: LocationDetail;
  dropoffLocation: LocationDetail | null;
  vehicleCategory: string;
  serviceRecipientName?: string | null;
  savedPersonId?: string | null;
  preferredDriverId?: string | null;
  preferredDriverName?: string | null;
  lastBookedAt?: string | null;
  estimatedFare: number;
}

export interface UpfrontPaymentSummary {
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  taxesAndFees: number;
  discountAmount: number;
  totalFare: number;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  paymentMethod: string;
}

export interface UpfrontServiceSummary {
  bookingType: BookingType;
  pickupLocation: LocationDetail;
  dropoffLocation: LocationDetail | null;
  vehicleCategory: string;
  serviceRecipient: {
    fullName: string;
    phone?: string | null;
    isForSomeoneElse: boolean;
  };
  preferredDriver?: {
    id: string;
    displayName: string;
  } | null;
  paymentSummary: UpfrontPaymentSummary;
}

/**
 * Smart Rebooking Service
 * Calculates smart defaults, quick 1-tap rebook templates, upfront pricing,
 * and handles 1-tap booking creation for returning customers.
 */
export async function getSmartBookingDefaults(
  customerId: string,
  dbClient: Db = prisma,
): Promise<SmartBookingDefaults> {
  const [recentBookings, savedLocations, customerPref, savedPeople, favoriteDrivers] =
    await Promise.all([
      dbClient.booking.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          serviceRecipient: true,
          driverProfile: {
            select: { id: true, displayName: true, firstName: true, lastName: true },
          },
        },
      }),
      dbClient.savedLocation.findMany({
        where: { userId: customerId },
        orderBy: { isDefault: 'desc' },
        take: 5,
      }),
      dbClient.customerPreference.findUnique({
        where: { userId: customerId },
      }),
      dbClient.customerSavedPerson.findMany({
        where: { customerId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      dbClient.customerFavoriteDriver.findMany({
        where: { customerId },
        include: {
          driverProfile: {
            select: { id: true, displayName: true, firstName: true, lastName: true },
          },
        },
        take: 3,
      }),
    ]);

  const hasPreviousBookings = recentBookings.length > 0;
  const lastBooking = recentBookings[0] as Record<string, unknown> | undefined;

  // Determine Pickup Location default:
  let pickupLocation: LocationDetail | null = null;
  if (lastBooking && lastBooking.pickupAddress && lastBooking.pickupLatitude != null) {
    pickupLocation = {
      address: String(lastBooking.pickupAddress),
      label: (lastBooking.pickupLabel as string) || null,
      latitude: Number(lastBooking.pickupLatitude),
      longitude: Number(lastBooking.pickupLongitude),
    };
  } else if (savedLocations.length > 0) {
    const defaultSaved = savedLocations.find((loc) => loc.isDefault) || savedLocations[0];
    pickupLocation = {
      address: `${defaultSaved.addressLine1}, ${defaultSaved.city}`,
      label: defaultSaved.label,
      latitude: Number(defaultSaved.latitude),
      longitude: Number(defaultSaved.longitude),
    };
  }

  // Determine Dropoff Location default:
  let dropoffLocation: LocationDetail | null = null;
  if (lastBooking && lastBooking.dropoffAddress && lastBooking.dropoffLatitude != null) {
    dropoffLocation = {
      address: String(lastBooking.dropoffAddress),
      label: (lastBooking.dropoffLabel as string) || null,
      latitude: Number(lastBooking.dropoffLatitude),
      longitude: Number(lastBooking.dropoffLongitude),
    };
  } else if (savedLocations.length > 1) {
    const secondarySaved = savedLocations.find((loc) => !loc.isDefault) || savedLocations[1];
    dropoffLocation = {
      address: `${secondarySaved.addressLine1}, ${secondarySaved.city}`,
      label: secondarySaved.label,
      latitude: Number(secondarySaved.latitude),
      longitude: Number(secondarySaved.longitude),
    };
  }

  // Booking Type default
  const bookingType: BookingType = lastBooking
    ? (lastBooking.bookingType as BookingType)
    : 'ONE_WAY';

  // Vehicle Category default
  const vehicleCategory: string =
    customerPref?.preferredVehicleCategory ||
    (lastBooking?.vehicleCategory as string) ||
    'SEDAN';

  // Payment Method default
  const paymentMethod = 'CASH';

  // Saved Person default
  let savedPersonId: string | null = null;
  let savedPersonName: string | null = null;
  const lastRecipient = lastBooking?.serviceRecipient as Record<string, unknown> | undefined;
  if (lastRecipient?.fullName) {
    savedPersonName = String(lastRecipient.fullName);
  } else if (savedPeople.length > 0) {
    savedPersonId = savedPeople[0].id;
    savedPersonName = savedPeople[0].fullName;
  }

  // Preferred Driver default
  let preferredDriverId: string | null = null;
  let preferredDriverName: string | null = null;
  if (favoriteDrivers.length > 0 && favoriteDrivers[0].driverProfile) {
    const dp = favoriteDrivers[0].driverProfile;
    preferredDriverId = dp.id;
    preferredDriverName =
      dp.displayName || [dp.firstName, dp.lastName].filter(Boolean).join(' ') || 'Favorite Driver';
  } else if (lastBooking?.driverProfile) {
    const dp = lastBooking.driverProfile as Record<string, unknown>;
    preferredDriverId = String(dp.id);
    preferredDriverName =
      (dp.displayName as string) ||
      [dp.firstName, dp.lastName].filter(Boolean).join(' ') ||
      'Previous Driver';
  }

  return {
    pickupLocation,
    dropoffLocation,
    bookingType,
    vehicleCategory,
    paymentMethod,
    savedPersonId,
    savedPersonName,
    preferredDriverId,
    preferredDriverName,
    hasPreviousBookings,
  };
}

/**
 * Generates quick rebooking cards for returning customers.
 */
export async function getQuickRebookTemplates(
  customerId: string,
  dbClient: Db = prisma,
): Promise<QuickRebookCard[]> {
  const [recentCompleted, savedLocations] = await Promise.all([
    dbClient.booking.findMany({
      where: { customerId, status: 'TRIP_COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        serviceRecipient: true,
        driverProfile: { select: { id: true, displayName: true } },
      },
    }),
    dbClient.savedLocation.findMany({
      where: { userId: customerId },
      orderBy: { isDefault: 'desc' },
      take: 4,
    }),
  ]);

  const cards: QuickRebookCard[] = [];
  const seenKeys = new Set<string>();

  for (const tripRaw of recentCompleted) {
    const trip = tripRaw as Record<string, unknown>;
    const pickupAddress = trip.pickupAddress as string | undefined;
    const dropoffAddress = trip.dropoffAddress as string | undefined;

    if (!pickupAddress || trip.pickupLatitude == null) continue;

    const key = `${pickupAddress}->${dropoffAddress || 'NO_DROPOFF'}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const pickupLoc: LocationDetail = {
      address: pickupAddress,
      label: (trip.pickupLabel as string) || null,
      latitude: Number(trip.pickupLatitude),
      longitude: Number(trip.pickupLongitude),
    };

    const dropoffLoc: LocationDetail | null = dropoffAddress
      ? {
          address: dropoffAddress,
          label: (trip.dropoffLabel as string) || null,
          latitude: Number(trip.dropoffLatitude),
          longitude: Number(trip.dropoffLongitude),
        }
      : null;

    const fare = Number(trip.finalFareAmount ?? trip.estimatedFareAmount ?? 450);
    const driverProfile = trip.driverProfile as Record<string, unknown> | undefined;
    const serviceRecipient = trip.serviceRecipient as Record<string, unknown> | undefined;

    const title =
      pickupLoc.label && dropoffLoc?.label
        ? `${pickupLoc.label} → ${dropoffLoc.label}`
        : pickupLoc.label
          ? `${pickupLoc.label} Trip`
          : `Repeat Ride #${String(trip.id).substring(0, 6)}`;

    const subtitle = dropoffLoc
      ? `${pickupLoc.address.split(',')[0]} to ${dropoffLoc.address.split(',')[0]}`
      : `From ${pickupLoc.address.split(',')[0]}`;

    cards.push({
      id: `rebook-${String(trip.id)}`,
      title,
      subtitle,
      bookingType: trip.bookingType as BookingType,
      pickupLocation: pickupLoc,
      dropoffLocation: dropoffLoc,
      vehicleCategory: (trip.vehicleCategory as string) || 'SEDAN',
      serviceRecipientName: (serviceRecipient?.fullName as string) || null,
      preferredDriverId: (driverProfile?.id as string) || null,
      preferredDriverName: (driverProfile?.displayName as string) || null,
      lastBookedAt: (trip.createdAt as Date).toISOString(),
      estimatedFare: fare,
    });
  }

  // If customer has saved locations like Home & Office, generate a Saved Route card
  if (savedLocations.length >= 2 && cards.length < 3) {
    const home = savedLocations.find((l) => l.label.toLowerCase().includes('home')) || savedLocations[0];
    const work = savedLocations.find((l) => l.label.toLowerCase().includes('work') || l.label.toLowerCase().includes('office')) || savedLocations[1];

    if (home && work && home.id !== work.id) {
      const routeKey = `${home.id}->${work.id}`;
      if (!seenKeys.has(routeKey)) {
        cards.push({
          id: `saved-route-${routeKey}`,
          title: `${home.label} → ${work.label}`,
          subtitle: `Commute from ${home.city}`,
          bookingType: 'ONE_WAY',
          pickupLocation: {
            address: `${home.addressLine1}, ${home.city}`,
            label: home.label,
            latitude: Number(home.latitude),
            longitude: Number(home.longitude),
          },
          dropoffLocation: {
            address: `${work.addressLine1}, ${work.city}`,
            label: work.label,
            latitude: Number(work.latitude),
            longitude: Number(work.longitude),
          },
          vehicleCategory: 'SEDAN',
          estimatedFare: 350,
        });
      }
    }
  }

  return cards.slice(0, 4);
}

/**
 * Calculates upfront service & payment summary for 1-tap booking review step.
 */
export async function calculateUpfrontSummary(
  _customerId: string,
  params: {
    pickupLocation: LocationDetail;
    dropoffLocation?: LocationDetail | null;
    bookingType: BookingType;
    vehicleCategory?: string;
    savedPersonId?: string | null;
    preferredDriverId?: string | null;
  },
  dbClient: Db = prisma,
): Promise<UpfrontServiceSummary> {
  const { pickupLocation, dropoffLocation, bookingType, vehicleCategory = 'SEDAN', savedPersonId, preferredDriverId } = params;

  // Calculate distance & estimated fare
  let distanceKm = 15.0;
  let durationMins = 35;

  if (pickupLocation && dropoffLocation) {
    const latDiff = Math.abs(pickupLocation.latitude - dropoffLocation.latitude);
    const lngDiff = Math.abs(pickupLocation.longitude - dropoffLocation.longitude);
    const approxDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
    if (approxDist > 0) {
      distanceKm = Math.round(approxDist * 10) / 10;
      durationMins = Math.round(distanceKm * 2.5);
    }
  }

  const fareEstimate = await calculateEstimatedFare(
    {
      bookingType,
      pickup: { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
      dropoff: dropoffLocation ? { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude } : null,
      estimatedDurationMinutes: durationMins,
    },
    dbClient,
  );

  const baseFare = Number(fareEstimate.breakdown.baseFareAmount);
  const distanceFare = Number(fareEstimate.breakdown.distanceFareAmount);
  const durationFare = Number(fareEstimate.breakdown.durationFareAmount);
  const totalFare = Number(fareEstimate.breakdown.totalFareAmount);
  const taxesAndFees = Math.round(totalFare * 0.18); // 18% GST

  // Fetch recipient details if savedPersonId provided
  let serviceRecipient: UpfrontServiceSummary['serviceRecipient'] = {
    fullName: 'You',
    phone: null,
    isForSomeoneElse: false,
  };

  if (savedPersonId) {
    const person = await dbClient.customerSavedPerson.findUnique({
      where: { id: savedPersonId },
    });
    if (person) {
      serviceRecipient = {
        fullName: person.fullName,
        phone: person.phone,
        isForSomeoneElse: true,
      };
    }
  }

  // Fetch driver details if preferredDriverId provided
  let preferredDriver: UpfrontServiceSummary['preferredDriver'] = null;
  if (preferredDriverId) {
    const driver = await dbClient.driverProfile.findUnique({
      where: { id: preferredDriverId },
      select: { id: true, displayName: true, firstName: true, lastName: true },
    });
    if (driver) {
      preferredDriver = {
        id: driver.id,
        displayName:
          driver.displayName || [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Chauffeur',
      };
    }
  }

  return {
    bookingType,
    pickupLocation,
    dropoffLocation: dropoffLocation || null,
    vehicleCategory,
    serviceRecipient,
    preferredDriver,
    paymentSummary: {
      baseFare,
      distanceFare,
      durationFare,
      taxesAndFees,
      discountAmount: 0,
      totalFare: totalFare + taxesAndFees,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMinutes: durationMins,
      paymentMethod: 'CASH',
    },
  };
}
