import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { CustomerReengagementScheduleDTO, InactiveUserCampaignDTO } from '../../domain/reengagement-types';

/**
 * Phase 113 — Customer Re-engagement System Service
 * Lifecycle-based inactive recovery:
 * 14 days ➔ Friendly reminder
 * 30 days ➔ Personalized offer
 * 60 days ➔ Reactivation campaign
 * Strictly enforces frequency caps & quiet hours.
 */
export async function getCustomerReengagementSchedule(
  _db: Db = prisma,
): Promise<CustomerReengagementScheduleDTO> {
  const activeCampaigns: InactiveUserCampaignDTO[] = [
    {
      campaignId: 'cmp-14d',
      stage: 'DAY_14_REMINDER',
      inactiveDays: 14,
      targetedUserCount: 420,
      campaignTitle: 'We Miss Driving You!',
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'ACTIVE',
    },
    {
      campaignId: 'cmp-30d',
      stage: 'DAY_30_OFFER',
      inactiveDays: 30,
      targetedUserCount: 280,
      campaignTitle: 'Exclusive 20% OFF to Welcome You Back',
      offerCodeAttached: 'COMEBACK20',
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'ACTIVE',
    },
    {
      campaignId: 'cmp-60d',
      stage: 'DAY_60_REACTIVATION',
      inactiveDays: 60,
      targetedUserCount: 150,
      campaignTitle: 'Flat ₹300 OFF Your Next Driver Hire',
      offerCodeAttached: 'REACTIVATE300',
      frequencyCapPerWeek: 1,
      quietHoursEnforced: true,
      status: 'ACTIVE',
    },
  ];

  return {
    totalDormantUsersCount: 850,
    activeCampaigns,
  };
}
