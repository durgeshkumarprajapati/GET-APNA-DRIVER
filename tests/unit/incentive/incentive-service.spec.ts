import {
  createCampaign,
  updateCampaignStatus,
  getDriverActiveIncentives,
} from '@/modules/incentive/application/services/incentive-campaign-service';
import {
  getDriverGoal,
  updateDriverGoal,
} from '@/modules/incentive/application/services/driver-goal-service';
import { getDriverEarningsSummary } from '@/modules/incentive/application/services/driver-earnings-service';
import { evaluateDriverIncentivesForCompletedTrip } from '@/modules/incentive/application/services/incentive-evaluator-service';
import { prisma } from '@/shared/database/prisma';
import {
  InvalidIncentiveDatesError,
  InvalidIncentiveCampaignStatusTransitionError,
} from '@/modules/incentive/domain/errors';
import { IncentiveCampaignStatus, IncentiveType } from '@prisma/client';

describe('Phase 34 — Driver Earnings, Incentive & Goal Engine', () => {
  let testDriverUserId: string;
  let testDriverProfileId: string;
  let createdCampaignId: string;

  beforeAll(async () => {
    // Create test driver
    const driverUser = await prisma.user.create({
      data: {
        accountStatus: 'ACTIVE',
        driverProfile: {
          create: {
            firstName: 'Incentive',
            lastName: 'Partner',
            displayName: 'Incentive Chauffeur',
            approvalStatus: 'APPROVED',
            availabilityStatus: 'AVAILABLE',
            drivingExperienceYears: 5,
            primaryServiceArea: 'Gurugram',
          },
        },
      },
      include: { driverProfile: true },
    });
    testDriverUserId = driverUser.id;
    testDriverProfileId = driverUser.driverProfile!.id;
  });

  afterAll(async () => {
    if (createdCampaignId) {
      await prisma.driverIncentiveProgress.deleteMany({
        where: { campaignId: createdCampaignId },
      });
      await prisma.driverIncentiveCampaign.delete({
        where: { id: createdCampaignId },
      }).catch(() => {});
    }
    if (testDriverProfileId) {
      await prisma.driverGoalPreference.deleteMany({
        where: { driverProfileId: testDriverProfileId },
      });
    }
    if (testDriverUserId) {
      await prisma.user.delete({ where: { id: testDriverUserId } }).catch(() => {});
    }
  });

  describe('Campaign Lifecycle & Management', () => {
    it('creates a new campaign in DRAFT status', async () => {
      const now = new Date(Date.now() - 60000);
      const endAt = new Date(Date.now() + 7 * 86400000);

      const campaign = await createCampaign({
        name: 'Test Weekend Sprint',
        description: 'Complete 5 trips for ₹500',
        incentiveType: IncentiveType.TRIP_COUNT,
        targetValue: 5,
        rewardAmount: 500,
        startAt: now,
        endAt,
      });

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Test Weekend Sprint');
      expect(campaign.status).toBe(IncentiveCampaignStatus.DRAFT);
      expect(Number(campaign.targetValue)).toBe(5);
      expect(Number(campaign.rewardAmount)).toBe(500);

      createdCampaignId = campaign.id;
    });

    it('rejects invalid end dates (endAt <= startAt)', async () => {
      const now = new Date();
      await expect(
        createCampaign({
          name: 'Invalid Dates Campaign',
          incentiveType: IncentiveType.TRIP_COUNT,
          targetValue: 5,
          rewardAmount: 500,
          startAt: now,
          endAt: new Date(now.getTime() - 1000),
        }),
      ).rejects.toThrow(InvalidIncentiveDatesError);
    });

    it('transitions campaign status safely DRAFT -> ACTIVE -> PAUSED -> ACTIVE', async () => {
      // DRAFT -> ACTIVE
      let updated = await updateCampaignStatus(createdCampaignId, IncentiveCampaignStatus.ACTIVE);
      expect(updated.status).toBe(IncentiveCampaignStatus.ACTIVE);

      // ACTIVE -> PAUSED
      updated = await updateCampaignStatus(createdCampaignId, IncentiveCampaignStatus.PAUSED);
      expect(updated.status).toBe(IncentiveCampaignStatus.PAUSED);

      // PAUSED -> ACTIVE
      updated = await updateCampaignStatus(createdCampaignId, IncentiveCampaignStatus.ACTIVE);
      expect(updated.status).toBe(IncentiveCampaignStatus.ACTIVE);
    });

    it('prevents invalid status transition DRAFT -> EXPIRED', async () => {
      const draftCampaign = await createCampaign({
        name: 'Draft Campaign Test',
        incentiveType: IncentiveType.TRIP_COUNT,
        targetValue: 2,
        rewardAmount: 100,
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000),
      });

      await expect(
        updateCampaignStatus(draftCampaign.id, IncentiveCampaignStatus.EXPIRED),
      ).rejects.toThrow(InvalidIncentiveCampaignStatusTransitionError);

      await prisma.driverIncentiveCampaign.delete({ where: { id: draftCampaign.id } });
    });
  });

  describe('Driver Goals & Summary', () => {
    it('initializes default driver goals', async () => {
      const goal = await getDriverGoal(testDriverProfileId);
      expect(goal).toBeDefined();
      expect(goal.driverProfileId).toBe(testDriverProfileId);
      expect(goal.dailyTripGoal).toBe(8);
      expect(goal.weeklyEarningsGoal).toBe(10000);
      expect(goal.completedTripsToday).toBe(0);
    });

    it('updates driver goal preferences', async () => {
      const updatedGoal = await updateDriverGoal(testDriverProfileId, {
        dailyTripGoal: 12,
        weeklyEarningsGoal: 15000,
      });

      expect(updatedGoal.dailyTripGoal).toBe(12);
      expect(updatedGoal.weeklyEarningsGoal).toBe(15000);
    });

    it('returns driver earnings summary', async () => {
      const summary = await getDriverEarningsSummary(testDriverProfileId);
      expect(summary).toBeDefined();
      expect(summary.driverProfileId).toBe(testDriverProfileId);
      expect(summary.currency).toBe('INR');
      expect(summary.todayEarnings).toBe('0.00');
    });
  });

  describe('Incentive Evaluation & Reward Qualification', () => {
    it('evaluates active incentives and updates driver progress', async () => {
      const activeIncentivesBefore = await getDriverActiveIncentives(testDriverProfileId);
      expect(activeIncentivesBefore.length).toBeGreaterThan(0);

      // Simulate completed trip
      const evaluation = await evaluateDriverIncentivesForCompletedTrip({
        driverProfileId: testDriverProfileId,
        bookingId: 'test-booking-id-1',
        fareAmount: '350.00',
        completedAt: new Date(),
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.length).toBeGreaterThan(0);

      const progress = evaluation.find((p) => p?.campaignId === createdCampaignId);
      expect(progress).toBeDefined();
      expect(Number(progress!.currentValue)).toBe(1);
    });
  });
});
