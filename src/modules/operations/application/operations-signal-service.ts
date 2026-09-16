import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, DriverAvailabilityStatus, SafetyIncidentStatus, SupportTicketStatus, ScheduledRideStatus } from '@prisma/client';

export interface OperationsRawSignals {
  searchingBookingsCount: number;
  assignedBookingsCount: number;
  activeTripsCount: number;
  onlineDriversCount: number;
  availableDriversCount: number;
  activeReliabilityIncidentsCount: number;
  criticalReliabilityIncidentsCount: number;
  activeSafetyIncidentsCount: number;
  openSupportTicketsCount: number;
  highPrioritySupportTicketsCount: number;
  upcomingUnassignedScheduledRidesCount: number;
  platformHealthScore: number;
  evaluatedAt: Date;
}

/**
 * OperationsSignalService aggregates real-time domain signals from existing
 * database tables and service layers in parallel.
 * Reuses existing domain models without duplicating domain state.
 */
export async function collectOperationsSignals(
  db: Db = prisma,
): Promise<OperationsRawSignals> {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

  const [
    searchingBookingsCount,
    assignedBookingsCount,
    activeTripsCount,
    onlineDriversCount,
    availableDriversCount,
    activeReliabilityIncidentsCount,
    criticalReliabilityIncidentsCount,
    activeSafetyIncidentsCount,
    openSupportTicketsCount,
    highPrioritySupportTicketsCount,
    upcomingUnassignedScheduledRidesCount,
  ] = await Promise.all([
    // Searching bookings
    db.booking.count({ where: { status: BookingStatus.SEARCHING_DRIVER } }).catch(() => 0),
    // Assigned bookings awaiting pickup
    db.booking.count({ where: { status: BookingStatus.DRIVER_ASSIGNED } }).catch(() => 0),
    // Active trips in progress
    db.booking.count({ where: { status: BookingStatus.TRIP_IN_PROGRESS } }).catch(() => 0),
    // Online drivers
    db.driverProfile
      .count({
        where: {
          availabilityStatus: {
            in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.BUSY],
          },
        },
      })
      .catch(() => 0),
    // Available drivers ready for assignment
    db.driverProfile
      .count({
        where: {
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      })
      .catch(() => 0),
    // Active reliability incidents (if model exists)
    db.tripReliabilityIncident
      ? db.tripReliabilityIncident.count({
          where: { status: { in: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING'] } },
        }).catch(() => 0)
      : Promise.resolve(0),
    // Critical reliability incidents
    db.tripReliabilityIncident
      ? db.tripReliabilityIncident.count({
          where: {
            severity: 'CRITICAL',
            status: { in: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING'] },
          },
        }).catch(() => 0)
      : Promise.resolve(0),
    // Active safety incidents
    db.safetyIncident.count({
      where: { status: { in: [SafetyIncidentStatus.OPEN, SafetyIncidentStatus.INVESTIGATING] } },
    }).catch(() => 0),
    // Open support tickets
    db.supportTicket.count({
      where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } },
    }).catch(() => 0),
    // High-priority support tickets
    db.supportTicket.count({
      where: {
        priority: 'HIGH',
        status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
      },
    }).catch(() => 0),
    // Upcoming unassigned scheduled rides (next 60m)
    db.scheduledRide
      ? db.scheduledRide.count({
          where: {
            status: ScheduledRideStatus.ACTIVE,
            assignedDriverId: null,
            scheduledFor: { gte: now, lte: nextHour },
          },
        }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  // Compute platform health score derived from open incidents and queues (100 = optimal)
  let healthScore = 100;
  if (activeSafetyIncidentsCount > 0) healthScore -= activeSafetyIncidentsCount * 15;
  if (criticalReliabilityIncidentsCount > 0) healthScore -= criticalReliabilityIncidentsCount * 10;
  if (searchingBookingsCount > availableDriversCount && searchingBookingsCount > 5) {
    healthScore -= 10;
  }
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    searchingBookingsCount,
    assignedBookingsCount,
    activeTripsCount,
    onlineDriversCount,
    availableDriversCount,
    activeReliabilityIncidentsCount,
    criticalReliabilityIncidentsCount,
    activeSafetyIncidentsCount,
    openSupportTicketsCount,
    highPrioritySupportTicketsCount,
    upcomingUnassignedScheduledRidesCount,
    platformHealthScore: healthScore,
    evaluatedAt: now,
  };
}
