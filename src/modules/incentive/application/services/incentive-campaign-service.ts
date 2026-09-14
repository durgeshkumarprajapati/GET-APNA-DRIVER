import 'server-only';
import { IncentiveCampaignStatus, IncentiveType, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import type {
  CreateIncentiveCampaignInput,
  UpdateIncentiveCampaignInput,
  DriverIncentiveProgressDTO,
} from '../../domain/types';
import {
  IncentiveCampaignNotFoundError,
  InvalidIncentiveCampaignStatusTransitionError,
  InvalidIncentiveDatesError,
} from '../../domain/errors';

export async function createCampaign(
  input: CreateIncentiveCampaignInput,
  db: Db = prisma,
) {
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  if (endAt <= startAt) {
    throw new InvalidIncentiveDatesError('Campaign end date must be after start date');
  }

  const targetVal = new Prisma.Decimal(input.targetValue);
  const rewardAmt = new Prisma.Decimal(input.rewardAmount);

  if (targetVal.lte(0)) {
    throw new InvalidIncentiveDatesError('Target value must be greater than 0');
  }
  if (rewardAmt.lte(0)) {
    throw new InvalidIncentiveDatesError('Reward amount must be greater than 0');
  }

  return db.driverIncentiveCampaign.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      incentiveType: input.incentiveType,
      targetValue: targetVal,
      rewardAmount: rewardAmt,
      startAt,
      endAt,
      timezone: input.timezone ?? 'Asia/Kolkata',
      status: IncentiveCampaignStatus.DRAFT,
      configuration: (input.configuration ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getCampaignById(campaignId: string, db: Db = prisma) {
  const campaign = await db.driverIncentiveCampaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: { progresses: true },
      },
    },
  });
  if (!campaign) {
    throw new IncentiveCampaignNotFoundError(campaignId);
  }
  return campaign;
}

export async function listCampaigns(
  filters?: { status?: IncentiveCampaignStatus; incentiveType?: IncentiveType },
  db: Db = prisma,
) {
  const where: Prisma.DriverIncentiveCampaignWhereInput = {};
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.incentiveType) {
    where.incentiveType = filters.incentiveType;
  }

  return db.driverIncentiveCampaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { progresses: true },
      },
    },
  });
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateIncentiveCampaignInput,
  db: Db = prisma,
) {
  const campaign = await getCampaignById(campaignId, db);

  const startAt = input.startAt ? new Date(input.startAt) : campaign.startAt;
  const endAt = input.endAt ? new Date(input.endAt) : campaign.endAt;

  if (endAt <= startAt) {
    throw new InvalidIncentiveDatesError('Campaign end date must be after start date');
  }

  const updateData: Prisma.DriverIncentiveCampaignUpdateInput = {
    startAt,
    endAt,
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.targetValue !== undefined) {
    const targetVal = new Prisma.Decimal(input.targetValue);
    if (targetVal.lte(0)) throw new InvalidIncentiveDatesError('Target value must be greater than 0');
    updateData.targetValue = targetVal;
  }
  if (input.rewardAmount !== undefined) {
    const rewardAmt = new Prisma.Decimal(input.rewardAmount);
    if (rewardAmt.lte(0)) throw new InvalidIncentiveDatesError('Reward amount must be greater than 0');
    updateData.rewardAmount = rewardAmt;
  }
  if (input.configuration !== undefined) {
    updateData.configuration = (input.configuration ?? undefined) as Prisma.InputJsonValue | undefined;
  }

  return db.driverIncentiveCampaign.update({
    where: { id: campaignId },
    data: updateData,
  });
}

export async function updateCampaignStatus(
  campaignId: string,
  newStatus: IncentiveCampaignStatus,
  db: Db = prisma,
) {
  const campaign = await getCampaignById(campaignId, db);
  const currentStatus = campaign.status;

  if (currentStatus === newStatus) {
    return campaign;
  }

  // Allowed transitions logic:
  // DRAFT -> ACTIVE, ARCHIVED
  // ACTIVE -> PAUSED, EXPIRED, ARCHIVED
  // PAUSED -> ACTIVE, ARCHIVED
  // EXPIRED -> ARCHIVED
  // ARCHIVED -> none
  const allowedTransitions: Record<IncentiveCampaignStatus, IncentiveCampaignStatus[]> = {
    [IncentiveCampaignStatus.DRAFT]: [IncentiveCampaignStatus.ACTIVE, IncentiveCampaignStatus.ARCHIVED],
    [IncentiveCampaignStatus.ACTIVE]: [
      IncentiveCampaignStatus.PAUSED,
      IncentiveCampaignStatus.EXPIRED,
      IncentiveCampaignStatus.ARCHIVED,
    ],
    [IncentiveCampaignStatus.PAUSED]: [IncentiveCampaignStatus.ACTIVE, IncentiveCampaignStatus.ARCHIVED],
    [IncentiveCampaignStatus.EXPIRED]: [IncentiveCampaignStatus.ARCHIVED],
    [IncentiveCampaignStatus.ARCHIVED]: [],
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    throw new InvalidIncentiveCampaignStatusTransitionError(currentStatus, newStatus);
  }

  return db.driverIncentiveCampaign.update({
    where: { id: campaignId },
    data: { status: newStatus },
  });
}

export async function getDriverActiveIncentives(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverIncentiveProgressDTO[]> {
  const activeCampaigns = await db.driverIncentiveCampaign.findMany({
    where: {
      status: IncentiveCampaignStatus.ACTIVE,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: { endAt: 'asc' },
  });

  if (activeCampaigns.length === 0) {
    return [];
  }

  const campaignIds = activeCampaigns.map((c) => c.id);

  const existingProgress = await db.driverIncentiveProgress.findMany({
    where: {
      driverProfileId,
      campaignId: { in: campaignIds },
    },
  });

  const progressMap = new Map(existingProgress.map((p) => [p.campaignId, p]));

  return activeCampaigns.map((campaign) => {
    const prog = progressMap.get(campaign.id);
    const currentValue = prog ? Number(prog.currentValue) : 0;
    const targetValue = Number(campaign.targetValue);
    const rewardAmount = Number(campaign.rewardAmount);
    const progressPercentage = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

    return {
      id: prog?.id ?? `pending-${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      description: campaign.description,
      incentiveType: campaign.incentiveType,
      status: prog?.status ?? 'IN_PROGRESS',
      currentValue,
      targetValue,
      rewardAmount,
      progressPercentage,
      qualifiedAt: prog?.qualifiedAt ? prog.qualifiedAt.toISOString() : null,
      rewardedAt: prog?.rewardedAt ? prog.rewardedAt.toISOString() : null,
      startAt: campaign.startAt.toISOString(),
      endAt: campaign.endAt.toISOString(),
    };
  });
}
