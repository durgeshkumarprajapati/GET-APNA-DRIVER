import { prisma } from '@/shared/database/prisma';
import { BookingStatus } from '@prisma/client';

export interface CorporateSpendReport {
  totalSpend: number;
  completedRidesCount: number;
  totalMembersCount: number;
  activePoliciesCount: number;
  departmentBreakdown: Array<{
    departmentId: string | null;
    departmentCode: string;
    departmentName: string;
    spend: number;
    rideCount: number;
  }>;
  costCenterBreakdown: Array<{
    costCenterId: string | null;
    costCenterCode: string;
    costCenterName: string;
    spend: number;
    rideCount: number;
  }>;
  recentRides: Array<{
    id: string;
    bookerName: string;
    pickupAddress: string;
    fareAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export async function getCorporateSpendReport(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CorporateSpendReport> {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };

  // 1. Fetch completed bookings for spend calculations
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId,
      status: BookingStatus.TRIP_COMPLETED,
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    },
    include: {
      customer: { select: { customerProfile: { select: { displayName: true, firstName: true } } } },
      department: true,
      costCenter: true,
    },
  });

  const totalSpend = bookings.reduce((sum, b) => {
    const amount = b.finalFareAmount || b.estimatedFareAmount || '0';
    return sum + Number(amount);
  }, 0);

  const completedRidesCount = bookings.length;

  // 2. Count active members & policies
  const totalMembersCount = await prisma.organizationMember.count({
    where: { organizationId, status: 'ACTIVE' },
  });

  const activePoliciesCount = await prisma.organizationTravelPolicy.count({
    where: { organizationId, status: 'ACTIVE' },
  });

  // 3. Department breakdown
  const deptMap = new Map<string, { departmentCode: string; departmentName: string; spend: number; rideCount: number }>();
  for (const b of bookings) {
    const key = b.departmentId || 'unassigned';
    const code = b.department?.code || 'GENERAL';
    const name = b.department?.name || 'General / Unassigned';
    const fare = Number(b.finalFareAmount || b.estimatedFareAmount || 0);

    const existing = deptMap.get(key) || { departmentCode: code, departmentName: name, spend: 0, rideCount: 0 };
    existing.spend += fare;
    existing.rideCount += 1;
    deptMap.set(key, existing);
  }

  const departmentBreakdown = Array.from(deptMap.entries()).map(([departmentId, val]) => ({
    departmentId: departmentId === 'unassigned' ? null : departmentId,
    ...val,
  }));

  // 4. Cost Center breakdown
  const ccMap = new Map<string, { costCenterCode: string; costCenterName: string; spend: number; rideCount: number }>();
  for (const b of bookings) {
    const key = b.costCenterId || 'unassigned';
    const code = b.costCenter?.code || 'GENERAL';
    const name = b.costCenter?.name || 'General / Unassigned';
    const fare = Number(b.finalFareAmount || b.estimatedFareAmount || 0);

    const existing = ccMap.get(key) || { costCenterCode: code, costCenterName: name, spend: 0, rideCount: 0 };
    existing.spend += fare;
    existing.rideCount += 1;
    ccMap.set(key, existing);
  }

  const costCenterBreakdown = Array.from(ccMap.entries()).map(([costCenterId, val]) => ({
    costCenterId: costCenterId === 'unassigned' ? null : costCenterId,
    ...val,
  }));

  // 5. Recent Rides
  const recentBookingsRaw = await prisma.booking.findMany({
    where: { organizationId },
    include: { customer: { select: { customerProfile: { select: { displayName: true, firstName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentRides = recentBookingsRaw.map((b) => {
    return {
      id: b.id,
      bookerName: b.customer?.customerProfile?.displayName || b.customer?.customerProfile?.firstName || 'Employee',
      pickupAddress: b.pickupAddress || 'Pickup Location',
      fareAmount: Number(b.finalFareAmount || b.estimatedFareAmount || 0),
      status: b.status,
      createdAt: b.createdAt,
    };
  });

  return {
    totalSpend,
    completedRidesCount,
    totalMembersCount,
    activePoliciesCount,
    departmentBreakdown,
    costCenterBreakdown,
    recentRides,
  };
}
