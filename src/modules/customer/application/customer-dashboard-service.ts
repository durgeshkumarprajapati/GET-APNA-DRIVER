import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';

export interface CustomerDashboardData {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    createdAt: string;
  };
  activeService: {
    id: string;
    status: string;
    bookingType: string;
    pickupLocation: { address: string; label?: string | null };
    dropoffLocation?: { address: string; label?: string | null } | null;
    driver?: {
      id: string;
      displayName: string | null;
      ratingAverage: number;
    } | null;
    serviceRecipient?: {
      fullName: string;
      phone: string;
      relationship?: string | null;
      isForSomeoneElse: boolean;
    } | null;
    requestedStartTime: string | null;
    etaMinutes: number | null;
  } | null;
  upcomingService: {
    id: string;
    status: string;
    bookingType: string;
    pickupLocation: { address: string; label?: string | null };
    dropoffLocation?: { address: string; label?: string | null } | null;
    driver?: {
      id: string;
      displayName: string | null;
      ratingAverage: number;
    } | null;
    serviceRecipient?: {
      fullName: string;
      phone: string;
      relationship?: string | null;
      isForSomeoneElse: boolean;
    } | null;
    requestedStartTime: string | null;
  } | null;
  savedPeople: Array<{
    id: string;
    fullName: string;
    phone: string;
    relationship?: string | null;
  }>;
  savedPlaces: Array<{
    id: string;
    label: string;
    addressLine1: string;
    city: string;
    isDefault: boolean;
  }>;
  recentServices: Array<{
    id: string;
    status: string;
    bookingType: string;
    pickupLocation: { address: string; label?: string | null };
    dropoffLocation?: { address: string; label?: string | null } | null;
    fareAmount: number;
    createdAt: string;
    isEligibleForBookAgain: boolean;
    driverName?: string | null;
    serviceRecipientName?: string | null;
  }>;
  bookAgainShortcuts: Array<{
    id: string;
    bookingType: string;
    pickupLocation: { address: string; label?: string | null };
    dropoffLocation?: { address: string; label?: string | null } | null;
    serviceRecipientName?: string | null;
    createdAt: string;
  }>;
  favoriteDrivers: Array<{
    driverProfileId: string;
    displayName: string | null;
    ratingAverage: number;
  }>;
  billingSummary: {
    pendingPaymentsCount: number;
    pendingPaymentsTotalAmount: number;
    latestPendingPayment?: {
      id: string;
      bookingId: string;
      amount: number;
    } | null;
    latestInvoice?: {
      id: string;
      invoiceNumber: string;
      bookingId?: string | null;
    } | null;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    actionLabel: string;
    actionUrl: string;
    icon: string;
    category: 'RECURRING' | 'BILLING' | 'PREFERENCE' | 'SAVED_PERSON';
  }>;
}

/**
 * Server-authoritative query service for intelligent customer dashboard.
 * Parallelizes independent read queries via Promise.all for zero N+1 latency.
 */
export async function getCustomerDashboardData(
  customerId: string,
  dbClient: Db = prisma,
): Promise<CustomerDashboardData> {
  const [
    userRaw,
    activeBookingRaw,
    upcomingBookingRaw,
    recentBookingsRaw,
    savedPeopleRaw,
    savedPlacesRaw,
    favoriteDriversRaw,
    customerPreferencesRaw,
    pendingPaymentsRaw,
    latestInvoiceRaw,
  ] = await Promise.all([
    // 1. Customer user profile
    (dbClient as any).user.findUnique({
      where: { id: customerId },
      include: {
        customerProfile: true,
        identities: { select: { identityType: true, identifier: true, email: true, phoneE164: true } },
      },
    }),
    // 2. Active booking
    (dbClient as any).booking.findFirst({
      where: {
        customerId,
        status: {
          in: [
            'SEARCHING_DRIVER',
            'DRIVER_ASSIGNED',
            'DRIVER_EN_ROUTE',
            'DRIVER_ARRIVED',
            'TRIP_IN_PROGRESS',
          ],
        },
      },
      include: {
        driverProfile: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
        serviceRecipient: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // 3. Upcoming booking
    (dbClient as any).booking.findFirst({
      where: {
        customerId,
        status: {
          in: ['DRAFT', 'DRIVER_ASSIGNED', 'SEARCHING_DRIVER'],
        },
        requestedStartTime: { gte: new Date() },
      },
      include: {
        driverProfile: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
        serviceRecipient: true,
      },
      orderBy: { requestedStartTime: 'asc' },
    }),
    // 4. Recent bookings (last 5)
    (dbClient as any).booking.findMany({
      where: { customerId },
      include: {
        driverProfile: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        serviceRecipient: true,
        payments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // 5. Saved people
    dbClient.customerSavedPerson.findMany({
      where: { customerId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    // 6. Saved locations
    dbClient.savedLocation.findMany({
      where: { userId: customerId },
      orderBy: { isDefault: 'desc' },
      take: 4,
    }),
    // 7. Favorite drivers
    (dbClient as any).customerFavoriteDriver.findMany({
      where: { customerId },
      include: {
        driverProfile: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 4,
    }),
    // 8. Customer preference
    dbClient.customerPreference.findUnique({
      where: { userId: customerId },
    }),
    // 9. Pending payments
    (dbClient as any).payment.findMany({
      where: { customerId, status: { in: ['CREATED', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // 10. Latest tax invoice
    dbClient.taxInvoice.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const user = userRaw as any;
  const activeBooking = activeBookingRaw as any;
  const upcomingBooking = upcomingBookingRaw as any;

  if (!user) {
    throw new Error('Customer user account not found');
  }

  const userEmail = user.identities?.find((i: any) => i.identityType === 'EMAIL' || i.email)?.email || user.credentials?.email || null;
  const userPhone = user.identities?.find((i: any) => i.identityType === 'PHONE' || i.phoneE164)?.phoneE164 || user.credentials?.phoneNumber || null;

  // Process Active Service
  let activeService: CustomerDashboardData['activeService'] = null;
  if (activeBooking) {
    const rawB = activeBooking as Record<string, unknown>;
    const pickupLocObj = rawB.pickupLocation as { address?: string; label?: string } | undefined;
    const pickupJson = rawB.pickupLocationJson as { address?: string } | undefined;
    const dropoffLocObj = rawB.dropoffLocation as { address?: string; label?: string } | undefined;
    const dropoffJson = rawB.dropoffLocationJson as { address?: string } | undefined;

    const driverName = activeBooking.driverProfile
      ? activeBooking.driverProfile.displayName ||
        [activeBooking.driverProfile.firstName, activeBooking.driverProfile.lastName]
          .filter(Boolean)
          .join(' ') ||
        'Assigned Driver'
      : null;

    activeService = {
      id: activeBooking.id,
      status: activeBooking.status,
      bookingType: activeBooking.bookingType,
      pickupLocation: {
        address:
          pickupLocObj?.address ??
          pickupJson?.address ??
          activeBooking.pickupAddress ??
          'Pickup location',
        label: pickupLocObj?.label ?? activeBooking.pickupLabel ?? null,
      },
      dropoffLocation: activeBooking.dropoffAddress
        ? {
            address:
              dropoffLocObj?.address ?? dropoffJson?.address ?? activeBooking.dropoffAddress,
            label: dropoffLocObj?.label ?? activeBooking.dropoffLabel ?? null,
          }
        : null,
      driver: activeBooking.driverProfile
        ? {
            id: activeBooking.driverProfile.id,
            displayName: driverName,
            ratingAverage: Number(activeBooking.driverProfile.ratingAverage || 5.0),
          }
        : null,
      serviceRecipient: activeBooking.serviceRecipient
        ? {
            fullName: activeBooking.serviceRecipient.fullName,
            phone: activeBooking.serviceRecipient.phone,
            relationship: activeBooking.serviceRecipient.relationship ?? null,
            isForSomeoneElse: true,
          }
        : {
            fullName: user.customerProfile?.displayName || 'You',
            phone: userPhone || '',
            isForSomeoneElse: false,
          },
      requestedStartTime: activeBooking.requestedStartTime
        ? activeBooking.requestedStartTime.toISOString()
        : null,
      etaMinutes: activeBooking.status === 'DRIVER_EN_ROUTE' ? 12 : 0,
    };
  }

  // Process Upcoming Service
  let upcomingService: CustomerDashboardData['upcomingService'] = null;
  if (upcomingBooking && upcomingBooking.id !== activeBooking?.id) {
    const rawB = upcomingBooking as Record<string, unknown>;
    const pickupLocObj = rawB.pickupLocation as { address?: string; label?: string } | undefined;
    const pickupJson = rawB.pickupLocationJson as { address?: string } | undefined;
    const dropoffLocObj = rawB.dropoffLocation as { address?: string; label?: string } | undefined;
    const dropoffJson = rawB.dropoffLocationJson as { address?: string } | undefined;

    const driverName = upcomingBooking.driverProfile
      ? upcomingBooking.driverProfile.displayName ||
        [upcomingBooking.driverProfile.firstName, upcomingBooking.driverProfile.lastName]
          .filter(Boolean)
          .join(' ')
      : null;

    upcomingService = {
      id: upcomingBooking.id,
      status: upcomingBooking.status,
      bookingType: upcomingBooking.bookingType,
      pickupLocation: {
        address:
          pickupLocObj?.address ??
          pickupJson?.address ??
          upcomingBooking.pickupAddress ??
          'Pickup location',
        label: pickupLocObj?.label ?? upcomingBooking.pickupLabel ?? null,
      },
      dropoffLocation: upcomingBooking.dropoffAddress
        ? {
            address:
              dropoffLocObj?.address ?? dropoffJson?.address ?? upcomingBooking.dropoffAddress,
            label: dropoffLocObj?.label ?? upcomingBooking.dropoffLabel ?? null,
          }
        : null,
      driver: upcomingBooking.driverProfile
        ? {
            id: upcomingBooking.driverProfile.id,
            displayName: driverName,
            ratingAverage: Number(upcomingBooking.driverProfile.ratingAverage || 5.0),
          }
        : null,
      serviceRecipient: upcomingBooking.serviceRecipient
        ? {
            fullName: upcomingBooking.serviceRecipient.fullName,
            phone: upcomingBooking.serviceRecipient.phone,
            relationship: upcomingBooking.serviceRecipient.relationship ?? null,
            isForSomeoneElse: true,
          }
        : {
            fullName: user.customerProfile?.displayName || 'You',
            phone: userPhone || '',
            isForSomeoneElse: false,
          },
      requestedStartTime: upcomingBooking.requestedStartTime
        ? upcomingBooking.requestedStartTime.toISOString()
        : null,
    };
  }

  // Process Recent Services
  const recentServices: CustomerDashboardData['recentServices'] = (recentBookingsRaw || []).map((b: any) => {
    const rawB = b as unknown as Record<string, unknown>;
    const pickupLocObj = rawB.pickupLocation as { address?: string; label?: string } | undefined;
    const pickupJson = rawB.pickupLocationJson as { address?: string } | undefined;
    const dropoffLocObj = rawB.dropoffLocation as { address?: string; label?: string } | undefined;
    const dropoffJson = rawB.dropoffLocationJson as { address?: string } | undefined;

    const driverName = b.driverProfile
      ? b.driverProfile.displayName ||
        [b.driverProfile.firstName, b.driverProfile.lastName].filter(Boolean).join(' ')
      : null;

    const fare = Number(b.finalFareAmount ?? b.estimatedFareAmount ?? b.payments?.[0]?.amount ?? 0);

    return {
      id: b.id,
      status: b.status,
      bookingType: b.bookingType,
      pickupLocation: {
        address:
          pickupLocObj?.address ?? pickupJson?.address ?? b.pickupAddress ?? 'Pickup location',
        label: pickupLocObj?.label ?? b.pickupLabel ?? null,
      },
      dropoffLocation: b.dropoffAddress
        ? {
            address: dropoffLocObj?.address ?? dropoffJson?.address ?? b.dropoffAddress,
            label: dropoffLocObj?.label ?? b.dropoffLabel ?? null,
          }
        : null,
      fareAmount: fare,
      createdAt: b.createdAt.toISOString(),
      isEligibleForBookAgain: b.status === 'TRIP_COMPLETED',
      driverName,
      serviceRecipientName: b.serviceRecipient?.fullName || null,
    };
  });

  // Book Again shortcuts (completed trips)
  const bookAgainShortcuts: CustomerDashboardData['bookAgainShortcuts'] = recentServices
    .filter((s) => s.isEligibleForBookAgain)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      bookingType: s.bookingType,
      pickupLocation: s.pickupLocation,
      dropoffLocation: s.dropoffLocation,
      serviceRecipientName: s.serviceRecipientName,
      createdAt: s.createdAt,
    }));

  // Saved People
  const savedPeople: CustomerDashboardData['savedPeople'] = savedPeopleRaw.map((p: any) => ({
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    relationship: p.relationship || null,
  }));

  // Saved Places
  const savedPlaces: CustomerDashboardData['savedPlaces'] = savedPlacesRaw.map((loc: any) => ({
    id: loc.id,
    label: loc.label,
    addressLine1: loc.addressLine1,
    city: loc.city,
    isDefault: loc.isDefault,
  }));

  // Favorite Drivers
  const favoriteDrivers: CustomerDashboardData['favoriteDrivers'] = (favoriteDriversRaw || []).map((f: any) => ({
    driverProfileId: f.driverProfile?.id || f.driverProfileId,
    displayName:
      f.driverProfile?.displayName ||
      [f.driverProfile?.firstName, f.driverProfile?.lastName].filter(Boolean).join(' ') ||
      'Chauffeur',
    ratingAverage: Number(f.driverProfile?.ratingAverage || 5.0),
  }));

  // Billing Summary
  const pendingTotal = (pendingPaymentsRaw || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const billingSummary: CustomerDashboardData['billingSummary'] = {
    pendingPaymentsCount: pendingPaymentsRaw.length,
    pendingPaymentsTotalAmount: pendingTotal,
    latestPendingPayment: pendingPaymentsRaw[0]
      ? {
          id: pendingPaymentsRaw[0].id,
          bookingId: pendingPaymentsRaw[0].bookingId,
          amount: Number(pendingPaymentsRaw[0].amount),
        }
      : null,
    latestInvoice: latestInvoiceRaw
      ? {
          id: latestInvoiceRaw.id,
          invoiceNumber: latestInvoiceRaw.invoiceNumber,
          bookingId: latestInvoiceRaw.bookingId,
        }
      : null,
  };

  // Deterministic Explainable Recommendations
  const recommendations: CustomerDashboardData['recommendations'] = [];

  // 1. Pending payment recommendation
  if (pendingPaymentsRaw.length > 0 && pendingPaymentsRaw[0]) {
    const pay = pendingPaymentsRaw[0];
    recommendations.push({
      id: `rec-pay-${pay.id}`,
      title: `Pending Payment Due`,
      description: `Complete payment of ₹${Number(pay.amount)} for booking #${pay.bookingId.substring(0, 8)}`,
      actionLabel: 'Pay Now',
      actionUrl: `/payments/${pay.id}`,
      icon: 'payment',
      category: 'BILLING',
    });
  }

  // 2. Book again for recipient recommendation
  const recipientRide = recentServices.find(
    (s) => s.serviceRecipientName && s.isEligibleForBookAgain,
  );
  if (recipientRide && recipientRide.serviceRecipientName) {
    recommendations.push({
      id: `rec-book-recip-${recipientRide.id}`,
      title: `Book Driver for ${recipientRide.serviceRecipientName}`,
      description: `Quickly repeat past driver booking for ${recipientRide.serviceRecipientName}`,
      actionLabel: 'Book Again',
      actionUrl: `/bookings/new?bookAgain=${recipientRide.id}`,
      icon: 'group',
      category: 'SAVED_PERSON',
    });
  } else if (bookAgainShortcuts.length > 0 && bookAgainShortcuts[0]) {
    recommendations.push({
      id: `rec-book-again-${bookAgainShortcuts[0].id}`,
      title: `Repeat Recent Service`,
      description: `Re-book your recent trip from ${bookAgainShortcuts[0].pickupLocation.address}`,
      actionLabel: 'Book Again',
      actionUrl: `/bookings/new?bookAgain=${bookAgainShortcuts[0].id}`,
      icon: 'history',
      category: 'RECURRING',
    });
  }

  // 3. Saved Places recommendation
  if (savedPlacesRaw.length === 0) {
    recommendations.push({
      id: 'rec-add-place',
      title: 'Save Home or Work Address',
      description: 'Add your frequently visited places for 1-click pickup selection',
      actionLabel: 'Add Saved Place',
      actionUrl: '/profile?tab=locations',
      icon: 'location_on',
      category: 'PREFERENCE',
    });
  }

  // 4. Saved People recommendation
  if (savedPeopleRaw.length === 0) {
    recommendations.push({
      id: 'rec-add-person',
      title: 'Save Family & Friends',
      description: 'Add saved people to quickly book chauffeurs for family or colleagues',
      actionLabel: 'Add Person',
      actionUrl: '/profile?tab=people',
      icon: 'person_add',
      category: 'PREFERENCE',
    });
  }

  // 5. Preference recommendation
  if (!customerPreferencesRaw?.preferredVehicleCategory) {
    recommendations.push({
      id: 'rec-set-pref',
      title: 'Set Smart Booking Preferences',
      description:
        'Save your preferred vehicle category and pickup instructions for faster bookings',
      actionLabel: 'Set Preferences',
      actionUrl: '/profile?tab=preferences',
      icon: 'tune',
      category: 'PREFERENCE',
    });
  }

  return {
    profile: {
      id: user.id,
      firstName: user.customerProfile?.firstName ?? null,
      lastName: user.customerProfile?.lastName ?? null,
      displayName: user.customerProfile?.displayName ?? null,
      email: userEmail ?? null,
      phoneNumber: userPhone ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    activeService,
    upcomingService,
    savedPeople,
    savedPlaces,
    recentServices,
    bookAgainShortcuts,
    favoriteDrivers,
    billingSummary,
    recommendations: recommendations.slice(0, 4),
  };
}
