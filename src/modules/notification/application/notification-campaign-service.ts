import 'server-only';
import {
  NotificationCampaign,
  CampaignStatus,
  CampaignTargetAudience,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { createNotification } from './notification-service';
import { CreateCampaignInput } from '../domain/types';

export async function createCampaign(
  actorUserId: string,
  input: CreateCampaignInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<NotificationCampaign> {
  return await dbClient.$transaction(async (tx) => {
    const campaign = await tx.notificationCampaign.create({
      data: {
        title: input.title,
        body: input.body,
        targetAudience: input.targetAudience,
        targetUserIds: (input.targetUserIds ?? []) as Prisma.InputJsonValue,
        status: input.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
        createdBy: actorUserId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: 'notification.campaign.created',
      entityType: 'NotificationCampaign',
      entityId: campaign.id,
      afterState: { title: campaign.title, audience: campaign.targetAudience },
      requestMetadata: requestMetadata ?? null,
    });

    return campaign;
  });
}

export async function sendCampaign(
  actorUserId: string,
  campaignId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<NotificationCampaign> {
  return await dbClient.$transaction(async (tx) => {
    const campaign = await tx.notificationCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Notification campaign not found: ${campaignId}`);
    }

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.PROCESSING
    ) {
      throw new Error(`Campaign ${campaignId} is already in state ${campaign.status}`);
    }

    const updated = await tx.notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PROCESSING,
        sentAt: new Date(),
      },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: 'notification.campaign.sent',
      entityType: 'NotificationCampaign',
      entityId: campaign.id,
      beforeState: { status: campaign.status },
      afterState: { status: updated.status },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'system.campaign.dispatch',
      aggregateType: 'NotificationCampaign',
      aggregateId: campaign.id,
      payload: { campaignId: campaign.id, sentBy: actorUserId },
    });

    return updated;
  });
}

export async function cancelCampaign(
  actorUserId: string,
  campaignId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<NotificationCampaign> {
  return await dbClient.$transaction(async (tx) => {
    const campaign = await tx.notificationCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Notification campaign not found: ${campaignId}`);
    }

    const updated = await tx.notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.CANCELLED,
      },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: 'notification.campaign.cancelled',
      entityType: 'NotificationCampaign',
      entityId: campaign.id,
      beforeState: { status: campaign.status },
      afterState: { status: updated.status },
      requestMetadata: requestMetadata ?? null,
    });

    return updated;
  });
}

export async function listCampaigns(
  limit: number = 20,
  offset: number = 0,
  db: Db = prisma,
): Promise<{ items: NotificationCampaign[]; total: number }> {
  const [items, total] = await Promise.all([
    db.notificationCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.notificationCampaign.count(),
  ]);

  return { items, total };
}

export async function processCampaignDispatch(campaignId: string, db: Db = prisma): Promise<void> {
  const campaign = await db.notificationCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.status === CampaignStatus.CANCELLED) {
    logger.info({ campaignId }, 'Campaign not eligible for dispatch');
    return;
  }

  // Resolve target users
  let targetUserIds: string[] = [];

  if (campaign.targetAudience === CampaignTargetAudience.SELECTED_USERS) {
    targetUserIds = (campaign.targetUserIds as string[]) ?? [];
  } else if (campaign.targetAudience === CampaignTargetAudience.ALL_CUSTOMERS) {
    const users = await db.user.findMany({
      where: { customerProfile: { isNot: null }, accountStatus: 'ACTIVE' },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  } else if (campaign.targetAudience === CampaignTargetAudience.ALL_DRIVERS) {
    const users = await db.user.findMany({
      where: { driverProfile: { isNot: null }, accountStatus: 'ACTIVE' },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  } else {
    // ALL_USERS
    const users = await db.user.findMany({
      where: { accountStatus: 'ACTIVE' },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of targetUserIds) {
    try {
      await createNotification(
        {
          userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: campaign.title,
          body: campaign.body,
          campaignId: campaign.id,
          idempotencyKey: `campaign-${campaign.id}-${userId}`,
        },
        db,
      );
      totalSent++;
    } catch (err) {
      totalFailed++;
      logger.error(
        { campaignId, userId, error: err },
        'Failed to dispatch campaign notification to user',
      );
    }
  }

  await db.notificationCampaign.update({
    where: { id: campaign.id },
    data: {
      status: CampaignStatus.COMPLETED,
      totalTargeted: targetUserIds.length,
      totalSent,
      totalFailed,
    },
  });

  logger.info(
    { campaignId: campaign.id, totalTargeted: targetUserIds.length, totalSent, totalFailed },
    'Completed notification campaign dispatch',
  );
}
