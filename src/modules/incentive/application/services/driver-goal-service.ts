import 'server-only';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import type { DriverGoalDTO } from '../../domain/types';

function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date: Date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  // Monday as start of week (0: Sun, 1: Mon... 6: Sat)
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getDriverGoal(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverGoalDTO> {
  const goalPref = await db.driverGoalPreference.upsert({
    where: { driverProfileId },
    create: {
      driverProfileId,
      dailyTripGoal: 8,
      weeklyEarningsGoal: new Prisma.Decimal(10000),
    },
    update: {},
  });

  const startOfDay = getStartOfDay(now);
  const startOfWeek = getStartOfWeek(now);

  const completedTripsToday = await db.booking.count({
    where: {
      driverProfileId,
      status: BookingStatus.TRIP_COMPLETED,
      tripCompletedAt: { gte: startOfDay },
    },
  });

  const weeklyBookings = await db.booking.aggregate({
    where: {
      driverProfileId,
      status: BookingStatus.TRIP_COMPLETED,
      tripCompletedAt: { gte: startOfWeek },
    },
    _sum: {
      finalFareAmount: true,
    },
  });

  const earningsThisWeek = Number(weeklyBookings._sum.finalFareAmount ?? 0);
  const dailyTripGoal = goalPref.dailyTripGoal;
  const weeklyEarningsGoal = Number(goalPref.weeklyEarningsGoal);

  const dailyTripProgressPercentage =
    dailyTripGoal > 0 ? Math.min(100, Math.round((completedTripsToday / dailyTripGoal) * 100)) : 0;

  const weeklyEarningsProgressPercentage =
    weeklyEarningsGoal > 0
      ? Math.min(100, Math.round((earningsThisWeek / weeklyEarningsGoal) * 100))
      : 0;

  return {
    driverProfileId,
    dailyTripGoal,
    completedTripsToday,
    dailyTripProgressPercentage,
    weeklyEarningsGoal,
    earningsThisWeek,
    weeklyEarningsProgressPercentage,
  };
}

export async function updateDriverGoal(
  driverProfileId: string,
  input: { dailyTripGoal?: number; weeklyEarningsGoal?: number | string },
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverGoalDTO> {
  const updateData: Prisma.DriverGoalPreferenceUpdateInput = {};

  if (input.dailyTripGoal !== undefined) {
    if (input.dailyTripGoal < 1) {
      throw new Error('Daily trip goal must be at least 1');
    }
    updateData.dailyTripGoal = input.dailyTripGoal;
  }

  if (input.weeklyEarningsGoal !== undefined) {
    const weeklyGoalVal = new Prisma.Decimal(input.weeklyEarningsGoal);
    if (weeklyGoalVal.lte(0)) {
      throw new Error('Weekly earnings goal must be greater than 0');
    }
    updateData.weeklyEarningsGoal = weeklyGoalVal;
  }

  await db.driverGoalPreference.upsert({
    where: { driverProfileId },
    create: {
      driverProfileId,
      dailyTripGoal: input.dailyTripGoal ?? 8,
      weeklyEarningsGoal: new Prisma.Decimal(input.weeklyEarningsGoal ?? 10000),
    },
    update: updateData,
  });

  return getDriverGoal(driverProfileId, now, db);
}
