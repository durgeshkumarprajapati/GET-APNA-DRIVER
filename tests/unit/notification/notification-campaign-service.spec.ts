import {
  createCampaign,
  sendCampaign,
  cancelCampaign,
  processCampaignDispatch,
} from '@/modules/notification/application/notification-campaign-service';
import { CampaignStatus, CampaignTargetAudience } from '@prisma/client';

interface MockDb {
  $transaction: jest.Mock;
  notificationCampaign: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  outboxEvent: {
    create: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
  };
  notification: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  notificationDelivery: {
    create: jest.Mock;
  };
  notificationPreference: {
    findUnique: jest.Mock;
  };
  pushSubscription: {
    findMany: jest.Mock;
  };
}

describe('NotificationCampaignService', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = {
      $transaction: jest.fn((callback) => callback(mockDb)),
      notificationCampaign: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'cust-1' }, { id: 'cust-2' }]),
      },
      notification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'n-1' }),
      },
      notificationDelivery: {
        create: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
      },
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  });

  it('creates notification campaign in DRAFT status', async () => {
    const mockCampaign = {
      id: 'camp-1',
      title: 'Weekend Discount',
      body: 'Get 20% off VVIP rides',
      targetAudience: CampaignTargetAudience.ALL_CUSTOMERS,
      status: CampaignStatus.DRAFT,
    };

    mockDb.notificationCampaign.create.mockResolvedValue(mockCampaign);

    const result = await createCampaign(
      'admin-user-1',
      {
        title: 'Weekend Discount',
        body: 'Get 20% off VVIP rides',
        targetAudience: CampaignTargetAudience.ALL_CUSTOMERS,
      },
      null,
      mockDb as unknown as Parameters<typeof createCampaign>[3],
    );

    expect(result).toEqual(mockCampaign);
    expect(mockDb.notificationCampaign.create).toHaveBeenCalledTimes(1);
    expect(mockDb.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('triggers sendCampaign by updating status to PROCESSING and creating OutboxEvent', async () => {
    const draftCampaign = {
      id: 'camp-100',
      title: 'Festival Offer',
      status: CampaignStatus.DRAFT,
    };

    mockDb.notificationCampaign.findUnique.mockResolvedValue(draftCampaign);
    mockDb.notificationCampaign.update.mockResolvedValue({
      ...draftCampaign,
      status: CampaignStatus.PROCESSING,
    });

    const result = await sendCampaign(
      'admin-user-1',
      'camp-100',
      null,
      mockDb as unknown as Parameters<typeof sendCampaign>[3],
    );

    expect(result.status).toBe(CampaignStatus.PROCESSING);
    expect(mockDb.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'system.campaign.dispatch',
        aggregateId: 'camp-100',
      }),
    });
  });

  it('cancels notification campaign', async () => {
    const draftCampaign = {
      id: 'camp-200',
      title: 'Festival Offer',
      status: CampaignStatus.DRAFT,
    };

    mockDb.notificationCampaign.findUnique.mockResolvedValue(draftCampaign);
    mockDb.notificationCampaign.update.mockResolvedValue({
      ...draftCampaign,
      status: CampaignStatus.CANCELLED,
    });

    const result = await cancelCampaign(
      'admin-user-1',
      'camp-200',
      null,
      mockDb as unknown as Parameters<typeof cancelCampaign>[3],
    );

    expect(result.status).toBe(CampaignStatus.CANCELLED);
  });

  it('processes campaign dispatch by bulk-creating notifications', async () => {
    const processingCampaign = {
      id: 'camp-300',
      title: 'System Alert',
      body: 'Scheduled maintenance tonight',
      targetAudience: CampaignTargetAudience.ALL_CUSTOMERS,
      targetUserIds: null,
      status: CampaignStatus.PROCESSING,
    };

    mockDb.notificationCampaign.findUnique.mockResolvedValue(processingCampaign);
    mockDb.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

    await processCampaignDispatch(
      'camp-300',
      mockDb as unknown as Parameters<typeof processCampaignDispatch>[1],
    );

    expect(mockDb.notificationCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-300' },
      data: expect.objectContaining({
        status: CampaignStatus.COMPLETED,
        totalTargeted: 2,
      }),
    });
  });
});
