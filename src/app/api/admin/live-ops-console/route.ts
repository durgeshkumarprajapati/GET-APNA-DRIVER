import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { BookingStatus, DriverAvailabilityStatus, DriverApprovalStatus, SafetyIncidentStatus } from '@prisma/client';

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_READ, async () => {
  try {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Operational Metrics
    const [
      activeBookingsCount,
      unassignedBookingsCount,
      driversOnlineCount,
      driversAvailableCount,
      driversBusyCount,
      totalDriversCount,
      activeSosCount,
      past24hBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          status: {
            in: [
              BookingStatus.DRIVER_ASSIGNED,
              BookingStatus.DRIVER_EN_ROUTE,
              BookingStatus.DRIVER_ARRIVED,
              BookingStatus.TRIP_IN_PROGRESS,
            ],
          },
        },
      }),
      prisma.booking.count({
        where: {
          status: {
            in: [BookingStatus.SEARCHING_DRIVER, BookingStatus.DRAFT],
          },
        },
      }),
      prisma.driverProfile.count({
        where: {
          availabilityStatus: {
            in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.BUSY],
          },
        },
      }),
      prisma.driverProfile.count({
        where: {
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      }),
      prisma.driverProfile.count({
        where: {
          availabilityStatus: DriverAvailabilityStatus.BUSY,
        },
      }),
      prisma.driverProfile.count({
        where: {
          approvalStatus: DriverApprovalStatus.APPROVED,
        },
      }),
      prisma.safetyIncident.count({
        where: {
          status: {
            in: [SafetyIncidentStatus.OPEN, SafetyIncidentStatus.INVESTIGATING, SafetyIncidentStatus.ESCALATED],
          },
        },
      }),
      prisma.booking.findMany({
        where: {
          requestedAt: { gte: past24h },
          status: { not: BookingStatus.CANCELLED },
        },
        select: {
          finalFareAmount: true,
          estimatedFareAmount: true,
        },
      }),
    ]);

    let gmv24h = 0;
    for (const b of past24hBookings) {
      const fare = b.finalFareAmount ?? b.estimatedFareAmount ?? 0;
      gmv24h += Number(fare);
    }
    const netCommission24h = Math.round(gmv24h * 0.185 * 100) / 100;

    const fleetUtilizationPercent =
      driversOnlineCount > 0
        ? Math.round((driversBusyCount / driversOnlineCount) * 1000) / 10
        : 0;

    // 2. Active Bookings Log
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: [
            BookingStatus.SEARCHING_DRIVER,
            BookingStatus.DRIVER_ASSIGNED,
            BookingStatus.DRIVER_EN_ROUTE,
            BookingStatus.DRIVER_ARRIVED,
            BookingStatus.TRIP_IN_PROGRESS,
          ],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            customerProfile: { select: { firstName: true, lastName: true, displayName: true } },
            identities: { select: { email: true } },
          },
        },
        driverProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        safetyIncidents: {
          where: {
            status: {
              in: [SafetyIncidentStatus.OPEN, SafetyIncidentStatus.INVESTIGATING, SafetyIncidentStatus.ESCALATED],
            },
          },
          select: { id: true, incidentNumber: true, severity: true, status: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });

    // 3. Online Drivers List
    const onlineDrivers = await prisma.driverProfile.findMany({
      where: {
        availabilityStatus: {
          in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.BUSY],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        availabilityStatus: true,
        approvalStatus: true,
        primaryServiceArea: true,
        drivingExperienceYears: true,
        user: {
          select: {
            id: true,
            identities: { select: { email: true } },
          },
        },
      },
      take: 50,
    });

    // 4. Pending KYC Applications
    const pendingKycDrivers = await prisma.driverProfile.findMany({
      where: {
        approvalStatus: DriverApprovalStatus.PENDING,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        approvalStatus: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            identities: { select: { email: true } },
          },
        },
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        gmv24h,
        netCommission24h,
        takeRatePercent: 18.5,
        activeDispatchGridCount: activeBookingsCount,
        unassignedBookingsCount,
        driversOnlineCount,
        driversAvailableCount,
        driversBusyCount,
        totalDriversCount,
        fleetUtilizationPercent,
        activeSosCount,
        customerNps: 86,
      },
      activeBookings: activeBookings.map((b) => {
        const custName =
          b.customer.customerProfile?.displayName ||
          (b.customer.customerProfile?.firstName
            ? `${b.customer.customerProfile.firstName} ${b.customer.customerProfile.lastName || ''}`.trim()
            : null) ||
          b.customer.identities.find((i) => i.email)?.email?.split('@')[0] ||
          'Customer';

        const fare = b.finalFareAmount ?? b.estimatedFareAmount ?? 0;

        return {
          id: b.id,
          bookingNumber: b.id.substring(0, 8).toUpperCase(),
          status: b.status,
          bookingType: b.bookingType,
          pickupAddress: b.pickupAddress,
          dropoffAddress: b.dropoffAddress || 'Flexible Route',
          scheduledPickupTime: b.requestedStartTime?.toISOString() || b.requestedAt.toISOString(),
          totalFareAmount: Number(fare),
          customerName: custName,
          driverName: b.driverProfile ? `${b.driverProfile.firstName} ${b.driverProfile.lastName}` : null,
          driverProfileId: b.driverProfileId,
          hasOpenSos: b.safetyIncidents.length > 0,
          sosSeverity: b.safetyIncidents[0]?.severity || null,
        };
      }),
      onlineDrivers: onlineDrivers.map((d) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        availabilityStatus: d.availabilityStatus,
        serviceArea: d.primaryServiceArea || 'General Zone',
        experienceYears: d.drivingExperienceYears,
      })),
      pendingKycDrivers: pendingKycDrivers.map((d) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        email: d.user.identities.find((i) => i.email)?.email || 'partner@getapnadriver.com',
        onboardingStatus: d.onboardingStatus,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch live ops console telemetry.';
    return NextResponse.json({ error: 'LIVE_OPS_FETCH_FAILED', message }, { status: 500 });
  }
});
