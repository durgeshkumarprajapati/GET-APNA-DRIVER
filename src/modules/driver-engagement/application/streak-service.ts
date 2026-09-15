import 'server-only';
import { type Db, prisma } from '@/shared/database/prisma';
import { StreakStatus } from '@prisma/client';
import { type DriverStreakDTO } from '../domain/achievement-types';

/**
 * Returns date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Calculates day difference between two YYYY-MM-DD date strings.
 */
export function getDayDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(`${dateStr1}T00:00:00Z`);
  const d2 = new Date(`${dateStr2}T00:00:00Z`);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 3600 * 24));
}

export async function getOrCreateDriverStreak(
  driverProfileId: string,
  db: Db = prisma,
): Promise<{
  id: string;
  driverProfileId: string;
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: Date | null;
  streakStatus: StreakStatus;
}> {
  return await db.driverStreak.upsert({
    where: { driverProfileId },
    create: {
      driverProfileId,
      currentStreak: 0,
      longestStreak: 0,
      lastQualifyingDate: null,
      streakStatus: StreakStatus.ACTIVE,
    },
    update: {},
  });
}

export async function updateDriverStreakOnQualifyingActivity(
  driverProfileId: string,
  activityDate: Date = new Date(),
  db: Db = prisma,
): Promise<DriverStreakDTO> {
  const existingStreak = await getOrCreateDriverStreak(driverProfileId, db);
  const todayKolkata = getKolkataDateString(activityDate);

  let newCurrentStreak = existingStreak.currentStreak;
  let newLongestStreak = existingStreak.longestStreak;
  const newDate = new Date(`${todayKolkata}T00:00:00.000Z`);

  if (!existingStreak.lastQualifyingDate) {
    // First ever qualifying activity
    newCurrentStreak = 1;
    newLongestStreak = Math.max(newLongestStreak, 1);
  } else {
    const lastDateKolkata = getKolkataDateString(existingStreak.lastQualifyingDate);
    const dayDiff = getDayDifference(lastDateKolkata, todayKolkata);

    if (dayDiff === 0) {
      // Same day — streak counts once per calendar day
      return {
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        lastQualifyingDate: lastDateKolkata,
        streakStatus: existingStreak.streakStatus,
      };
    } else if (dayDiff === 1) {
      // Consecutive day — increment streak
      newCurrentStreak = existingStreak.currentStreak + 1;
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    } else if (dayDiff > 1) {
      // Missed day — streak reset
      newCurrentStreak = 1;
      newLongestStreak = Math.max(newLongestStreak, 1);
    }
  }

  const updated = await db.driverStreak.update({
    where: { driverProfileId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastQualifyingDate: newDate,
      streakStatus: StreakStatus.ACTIVE,
    },
  });

  return {
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    lastQualifyingDate: updated.lastQualifyingDate
      ? getKolkataDateString(updated.lastQualifyingDate)
      : null,
    streakStatus: updated.streakStatus,
  };
}

export async function recalculateDriverStreak(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverStreakDTO> {
  const completedTrips = await db.booking.findMany({
    where: {
      driverProfileId,
      status: 'TRIP_COMPLETED',
    },
    select: { tripCompletedAt: true },
    orderBy: { tripCompletedAt: 'asc' },
  });

  if (completedTrips.length === 0) {
    const resetStreak = await db.driverStreak.upsert({
      where: { driverProfileId },
      create: { driverProfileId, currentStreak: 0, longestStreak: 0 },
      update: { currentStreak: 0, lastQualifyingDate: null },
    });
    return {
      currentStreak: 0,
      longestStreak: resetStreak.longestStreak,
      lastQualifyingDate: null,
      streakStatus: resetStreak.streakStatus,
    };
  }

  // Group unique dates in Asia/Kolkata
  const uniqueDates = Array.from(
    new Set(
      completedTrips
        .map((t) => (t.tripCompletedAt ? getKolkataDateString(t.tripCompletedAt) : null))
        .filter((d): d is string => d !== null),
    ),
  ).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let prevDate: string | null = null;

  for (const dateStr of uniqueDates) {
    if (!prevDate) {
      currentStreak = 1;
    } else {
      const diff = getDayDifference(prevDate, dateStr);
      if (diff === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    prevDate = dateStr;
  }

  const lastDate = uniqueDates[uniqueDates.length - 1];
  const todayKolkata = getKolkataDateString();
  const daysSinceLast = getDayDifference(lastDate, todayKolkata);

  // If last trip was more than 1 day ago, current streak breaks
  if (daysSinceLast > 1) {
    currentStreak = 0;
  }

  const updated = await db.driverStreak.upsert({
    where: { driverProfileId },
    create: {
      driverProfileId,
      currentStreak,
      longestStreak,
      lastQualifyingDate: new Date(`${lastDate}T00:00:00.000Z`),
    },
    update: {
      currentStreak,
      longestStreak,
      lastQualifyingDate: new Date(`${lastDate}T00:00:00.000Z`),
    },
  });

  return {
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    lastQualifyingDate: lastDate,
    streakStatus: updated.streakStatus,
  };
}
