import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, BookingType } from '@prisma/client';

export interface CustomerBookingQueryFilter {
  page?: number;
  pageSize?: number;
  statusTab?: 'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  search?: string;
  paymentStatus?: string;
}

export interface CustomerBookingCardItem {
  id: string;
  status: BookingStatus;
  bookingType: BookingType;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  } | null;
  requestedStartTime: string | null;
  createdAt: string;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  driver?: {
    id: string;
    displayName: string | null;
    profileImageUrl: string | null;
    phone?: string | null;
    primaryServiceArea: string | null;
    drivingExperienceYears: number;
  } | null;
  vehicleCategory?: {
    id: string;
    code: string;
    name: string;
  } | null;
  serviceRecipient?: {
    isForSomeoneElse: boolean;
    fullName: string;
    phone: string;
    relationship?: string | null;
  } | null;
  fareAmount: number;
  paymentStatus: string;
  paymentId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  refundId?: string | null;
  refundNumber?: string | null;
  refundedAmount?: number;
  rating?: number | null;
  reviewComment?: string | null;
  isEligibleForBookAgain: boolean;
}

export interface CustomerBookingQueryResponse {
  bookings: CustomerBookingCardItem[];
  counts: {
    all: number;
    upcoming: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function queryCustomerBookings(
  customerId: string,
  options: CustomerBookingQueryFilter = {},
  db: Db = prisma,
): Promise<CustomerBookingQueryResponse> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 15));
  const skip = (page - 1) * pageSize;

  const activeStatuses = [
    BookingStatus.DRIVER_EN_ROUTE,
    BookingStatus.DRIVER_ARRIVED,
    BookingStatus.TRIP_IN_PROGRESS,
  ];
  const upcomingStatuses = [BookingStatus.SEARCHING_DRIVER, BookingStatus.DRIVER_ASSIGNED];
  const completedStatuses = [BookingStatus.TRIP_COMPLETED];
  const cancelledStatuses = [BookingStatus.CANCELLED, BookingStatus.EXPIRED];

  // Tab counters for tab badges
  const [allCount, upcomingCount, activeCount, completedCount, cancelledCount] = await Promise.all([
    db.booking.count({ where: { customerId } }),
    db.booking.count({
      where: {
        customerId,
        OR: [
          { status: { in: upcomingStatuses }, tripStartedAt: null },
          { requestedStartTime: { gte: new Date() }, tripStartedAt: null },
        ],
      },
    }),
    db.booking.count({ where: { customerId, status: { in: activeStatuses } } }),
    db.booking.count({ where: { customerId, status: { in: completedStatuses } } }),
    db.booking.count({ where: { customerId, status: { in: cancelledStatuses } } }),
  ]);

  const whereClause: Record<string, unknown> = { customerId };

  // Apply Tab Filter
  const tab = options.statusTab || 'ALL';
  if (tab === 'UPCOMING') {
    whereClause.OR = [
      { status: { in: upcomingStatuses }, tripStartedAt: null },
      { requestedStartTime: { gte: new Date() }, tripStartedAt: null },
    ];
  } else if (tab === 'ACTIVE') {
    whereClause.status = { in: activeStatuses };
  } else if (tab === 'COMPLETED') {
    whereClause.status = { in: completedStatuses };
  } else if (tab === 'CANCELLED') {
    whereClause.status = { in: cancelledStatuses };
  }

  // Apply Date Range
  if (options.startDate || options.endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (options.startDate) createdAtFilter.gte = new Date(options.startDate);
    if (options.endDate) createdAtFilter.lte = new Date(options.endDate);
    whereClause.createdAt = createdAtFilter;
  }

  // Apply Search Filter (Booking ID, Driver Name, Recipient Name)
  if (options.search) {
    const s = options.search.trim();
    whereClause.AND = [
      {
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { driverProfile: { displayName: { contains: s, mode: 'insensitive' } } },
          { serviceRecipient: { fullName: { contains: s, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where: whereClause,
      include: {
        driverProfile: true,
        vehicleCategory: true,
        serviceRecipient: true,
        payments: {
          include: { refunds: true },
          orderBy: { createdAt: 'desc' },
        },
        taxInvoice: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.booking.count({ where: whereClause }),
  ]);

  const items: CustomerBookingCardItem[] = bookings.map((b) => {
    const primaryPayment = b.payments[0];
    const inv = b.taxInvoice;
    const latestRefund = primaryPayment?.refunds?.[0];
    const totalRefunded = (primaryPayment?.refunds || [])
      .filter((r) => r.status === 'PROCESSED')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const rawBooking = b as unknown as Record<string, unknown>;
    const pickupLocationObj = rawBooking.pickupLocation as
      | { latitude?: number; longitude?: number; address?: string; label?: string | null }
      | undefined;
    const pickupLocationJson = rawBooking.pickupLocationJson as
      | { address?: string }
      | undefined;
    const dropoffLocationObj = rawBooking.dropoffLocation as
      | { latitude?: number; longitude?: number; address?: string; label?: string | null }
      | undefined;
    const dropoffLocationJson = rawBooking.dropoffLocationJson as
      | { address?: string }
      | undefined;

    const pickupLoc = {
      latitude: pickupLocationObj?.latitude ?? b.pickupLatitude ?? 0,
      longitude: pickupLocationObj?.longitude ?? b.pickupLongitude ?? 0,
      address:
        pickupLocationObj?.address ??
        pickupLocationJson?.address ??
        b.pickupAddress ??
        'Pickup location',
      label: pickupLocationObj?.label ?? b.pickupLabel ?? null,
    };

    const dropoffAddress =
      dropoffLocationObj?.address ??
      dropoffLocationJson?.address ??
      b.dropoffAddress ??
      null;

    const dropoffLoc = dropoffAddress
      ? {
          latitude: dropoffLocationObj?.latitude ?? b.dropoffLatitude ?? 0,
          longitude: dropoffLocationObj?.longitude ?? b.dropoffLongitude ?? 0,
          address: dropoffAddress,
          label: dropoffLocationObj?.label ?? b.dropoffLabel ?? null,
        }
      : null;

    const fareAmount = Number(
      b.finalFareAmount ?? b.estimatedFareAmount ?? primaryPayment?.amount ?? 0,
    );

    return {
      id: b.id,
      status: b.status,
      bookingType: b.bookingType,
      pickupLocation: pickupLoc,
      dropoffLocation: dropoffLoc,
      requestedStartTime: b.requestedStartTime ? b.requestedStartTime.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      assignedAt: b.assignedAt ? b.assignedAt.toISOString() : null,
      driverEnRouteAt: b.driverEnRouteAt ? b.driverEnRouteAt.toISOString() : null,
      driverArrivedAt: b.driverArrivedAt ? b.driverArrivedAt.toISOString() : null,
      tripStartedAt: b.tripStartedAt ? b.tripStartedAt.toISOString() : null,
      tripCompletedAt: b.tripCompletedAt ? b.tripCompletedAt.toISOString() : null,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      cancelledBy: b.cancelledBy || null,
      cancellationReason: b.cancellationReason || null,
      driver: b.driverProfile
        ? {
            id: b.driverProfile.id,
            displayName: b.driverProfile.displayName,
            profileImageUrl: b.driverProfile.profileImageUrl,
            primaryServiceArea: b.driverProfile.primaryServiceArea,
            drivingExperienceYears: b.driverProfile.drivingExperienceYears,
          }
        : null,
      vehicleCategory: b.vehicleCategory
        ? {
            id: b.vehicleCategory.id,
            code: b.vehicleCategory.code,
            name: b.vehicleCategory.name,
          }
        : null,
      serviceRecipient: b.serviceRecipient
        ? {
            isForSomeoneElse: true,
            fullName: b.serviceRecipient.fullName,
            phone: b.serviceRecipient.phone,
            relationship: b.serviceRecipient.relationship || null,
          }
        : { isForSomeoneElse: false, fullName: 'You', phone: '' },
      fareAmount,
      paymentStatus: primaryPayment ? primaryPayment.status : 'PENDING',
      paymentId: primaryPayment?.id || null,
      invoiceId: inv?.id || null,
      invoiceNumber: inv?.invoiceNumber || null,
      refundId: latestRefund?.id || null,
      refundNumber: latestRefund?.refundNumber || null,
      refundedAmount: totalRefunded,
      rating: b.review ? b.review.rating : null,
      reviewComment: b.review ? b.review.comment : null,
      isEligibleForBookAgain: b.status === BookingStatus.TRIP_COMPLETED,
    };
  });

  return {
    bookings: items,
    counts: {
      all: allCount,
      upcoming: upcomingCount,
      active: activeCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
