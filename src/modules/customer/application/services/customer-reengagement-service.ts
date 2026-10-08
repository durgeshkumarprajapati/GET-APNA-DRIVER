import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  CustomerReengagementScheduleDTO,
  InactiveUserCampaignDTO,
} from '../../domain/reengagement-types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Count of customers whose most recent booking was created on/before `cutoff`, among customers with at least one booking. */
async function countInactiveSince(cutoff: Date, db: Db): Promise<number> {
  const lastBookingPerCustomer = await db.booking.groupBy({
    by: ['customerId'],
    _max: { createdAt: true },
  });
  return lastBookingPerCustomer.filter(
    (row) => row._max.createdAt !== null && row._max.createdAt <= cutoff,
  ).length;
}

/**
 * Phase 113 — Customer Re-engagement System Service
 * Lifecycle-based inactive recovery:
 * 14 days ➔ Friendly reminder
 * 30 days ➔ Personalized offer
 * 60 days ➔ Reactivation campaign
 *
 * A prior version hardcoded every targetedUserCount and totalDormantUsersCount,
 * named two coupon codes ('COMEBACK20', 'REACTIVATE300') that don't exist
 * anywhere in the system, and marked every stage status: 'ACTIVE' even
 * though nothing in this codebase actually sends these reminders yet (no
 * worker reads this schedule and dispatches notifications off it — unlike
 * the real scheduled-ride reminder sweep from Phase 90). Counts are now
 * real; stages are honestly 'SCHEDULED' (defined, not yet executing); and
 * offer codes are only attached when a real matching active promotion
 * exists.
 */
export async function getCustomerReengagementSchedule(
  db: Db = prisma,
): Promise<CustomerReengagementScheduleDTO> {
  const now = Date.now();
  const [count14d, count30d, count60d, comebackPromotion] = await Promise.all([
    countInactiveSince(new Date(now - 14 * DAY_MS), db),
    countInactiveSince(new Date(now - 30 * DAY_MS), db),
    countInactiveSince(new Date(now - 60 * DAY_MS), db),
    db.promotion.findFirst({
      where: { status: 'ACTIVE', firstRideOnly: false },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const activeCampaigns: InactiveUserCampaignDTO[] = [
    {
      campaignId: 'cmp-14d',
      stage: 'DAY_14_REMINDER',
      inactiveDays: 14,
      targetedUserCount: count14d,
      campaignTitle: 'We Miss Driving You!',
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'SCHEDULED',
    },
    {
      campaignId: 'cmp-30d',
      stage: 'DAY_30_OFFER',
      inactiveDays: 30,
      targetedUserCount: count30d,
      campaignTitle: 'Exclusive Offer to Welcome You Back',
      offerCodeAttached: comebackPromotion?.code ?? undefined,
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'SCHEDULED',
    },
    {
      campaignId: 'cmp-60d',
      stage: 'DAY_60_REACTIVATION',
      inactiveDays: 60,
      targetedUserCount: count60d,
      campaignTitle: 'Come Back to Get Apna Driver',
      offerCodeAttached: comebackPromotion?.code ?? undefined,
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'SCHEDULED',
    },
  ];

  return {
    totalDormantUsersCount: count14d,
    activeCampaigns,
  };
}
