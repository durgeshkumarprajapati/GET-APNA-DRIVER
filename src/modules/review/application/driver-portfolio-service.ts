import 'server-only';
import { ReviewStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { DriverProfileNotFoundError } from '@/modules/driver/domain/errors';
import {
  getDriverPerformanceMetrics,
  type DriverPerformanceMetrics,
} from './driver-performance-service';

export interface PortfolioReview {
  rating: number;
  comment: string | null;
  createdAt: Date;
  /** First name + last-initial, or "Verified Customer" — never email/phone/full name. */
  reviewerLabel: string;
}

export interface DriverPortfolio {
  driverProfileId: string;
  displayName: string;
  bio: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  approvalStatus: string;
  memberSince: Date;
  performance: DriverPerformanceMetrics;
  recentReviews: PortfolioReview[];
}

function reviewerLabel(
  profile: { firstName: string | null; lastName: string | null } | null,
): string {
  if (!profile?.firstName) return 'Verified Customer';
  const lastInitial = profile.lastName ? ` ${profile.lastName.charAt(0).toUpperCase()}.` : '';
  return `${profile.firstName}${lastInitial}`;
}

const RECENT_REVIEWS_LIMIT = 10;

/**
 * Composite driver portfolio — real profile + performance + a privacy-safe
 * slice of recent published reviews. Never includes a reviewer's email,
 * phone, or full name (see reviewerLabel), since this is designed to be
 * safely shown outside the driver's own account (e.g. a future public
 * profile), unlike the driver's own /driver/reviews inbox which shows full
 * review detail to the driver themselves.
 */
export async function getDriverPortfolio(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverPortfolio> {
  const profile = await db.driverProfile.findUnique({ where: { id: driverProfileId } });
  if (!profile) {
    throw new DriverProfileNotFoundError(driverProfileId);
  }

  const [performance, reviews] = await Promise.all([
    getDriverPerformanceMetrics(driverProfileId, db),
    db.review.findMany({
      where: { driverProfileId, status: ReviewStatus.PUBLISHED, comment: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_REVIEWS_LIMIT,
    }),
  ]);

  const customerProfiles = await db.customerProfile.findMany({
    where: { userId: { in: reviews.map((review) => review.customerId) } },
  });
  const profileByUserId = new Map(customerProfiles.map((profile) => [profile.userId, profile]));

  const displayName = profile.displayName
    ? profile.displayName
    : [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Driver Partner';

  return {
    driverProfileId,
    displayName,
    bio: profile.bio,
    drivingExperienceYears: profile.drivingExperienceYears,
    primaryServiceArea: profile.primaryServiceArea,
    approvalStatus: profile.approvalStatus,
    memberSince: profile.createdAt,
    performance,
    recentReviews: reviews.map((review) => ({
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewerLabel: reviewerLabel(profileByUserId.get(review.customerId) ?? null),
    })),
  };
}
