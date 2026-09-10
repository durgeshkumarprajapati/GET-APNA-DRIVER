jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    promotion: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    promotionUsage: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));

import { Prisma } from '@prisma/client';
import {
  activatePromotion,
  archivePromotion,
  createPromotion,
  getPromotionAnalytics,
  pausePromotion,
  updatePromotion,
} from '@/modules/promotion/application/services/promotion-service';
import { prisma } from '@/shared/database/prisma';
import {
  InvalidPromotionConfigError,
  InvalidPromotionStatusTransitionError,
  PromotionCodeAlreadyExistsError,
  PromotionNotEditableError,
  PromotionNotFoundError,
} from '@/modules/promotion/domain/errors';

const mockedPrisma = prisma as unknown as {
  promotion: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  promotionUsage: { findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock };
};

const validInput = {
  code: 'SAVE20',
  name: '20% Off',
  discountType: 'PERCENTAGE' as const,
  discountValue: '20',
  startsAt: '2026-01-01T00:00:00.000Z',
};

function draftPromotion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promotion-1',
    code: 'SAVE20',
    name: '20% Off',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: new Prisma.Decimal('20'),
    maxDiscountAmount: null,
    minBookingValue: null,
    firstRideOnly: false,
    isAutomatic: false,
    status: 'DRAFT',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: null,
    totalUsageLimit: null,
    totalUsageCount: 0,
    perUserUsageLimit: 1,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('createPromotion', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a promotion as DRAFT', async () => {
    mockedPrisma.promotion.create.mockResolvedValue(draftPromotion());

    const result = await createPromotion('admin-1', validInput);

    expect(result.status).toBe('DRAFT');
    expect(mockedPrisma.promotion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'DRAFT', code: 'SAVE20' }),
    });
  });

  it('rejects a percentage discount above 100', async () => {
    await expect(
      createPromotion('admin-1', { ...validInput, discountValue: '150' }),
    ).rejects.toThrow(InvalidPromotionConfigError);
    expect(mockedPrisma.promotion.create).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative discount value', async () => {
    await expect(createPromotion('admin-1', { ...validInput, discountValue: '0' })).rejects.toThrow(
      InvalidPromotionConfigError,
    );
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      createPromotion('admin-1', {
        ...validInput,
        startsAt: '2026-06-01T00:00:00.000Z',
        endsAt: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(InvalidPromotionConfigError);
  });

  it('rejects a non-automatic promotion with no code', async () => {
    await expect(
      createPromotion('admin-1', { ...validInput, code: null, isAutomatic: false }),
    ).rejects.toThrow(InvalidPromotionConfigError);
  });

  it('allows an automatic promotion with no code', async () => {
    mockedPrisma.promotion.create.mockResolvedValue(
      draftPromotion({ code: null, isAutomatic: true, firstRideOnly: true }),
    );
    const result = await createPromotion('admin-1', {
      ...validInput,
      code: null,
      isAutomatic: true,
      firstRideOnly: true,
    });
    expect(result.isAutomatic).toBe(true);
  });

  it('translates a duplicate code (P2002) into PromotionCodeAlreadyExistsError', async () => {
    mockedPrisma.promotion.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(createPromotion('admin-1', validInput)).rejects.toThrow(
      PromotionCodeAlreadyExistsError,
    );
  });
});

describe('updatePromotion', () => {
  afterEach(() => jest.clearAllMocks());

  it('allows editing a DRAFT promotion', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(draftPromotion());
    mockedPrisma.promotion.update.mockResolvedValue(draftPromotion({ name: 'Updated Name' }));

    const result = await updatePromotion('admin-1', 'promotion-1', {
      ...validInput,
      name: 'Updated Name',
    });
    expect(result.name).toBe('Updated Name');
  });

  it('rejects editing an ACTIVE promotion (already redeemable/redeemed)', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(draftPromotion({ status: 'ACTIVE' }));
    await expect(updatePromotion('admin-1', 'promotion-1', validInput)).rejects.toThrow(
      PromotionNotEditableError,
    );
    expect(mockedPrisma.promotion.update).not.toHaveBeenCalled();
  });

  it('throws when the promotion does not exist', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(null);
    await expect(updatePromotion('admin-1', 'missing', validInput)).rejects.toThrow(
      PromotionNotFoundError,
    );
  });
});

describe('promotion lifecycle transitions', () => {
  afterEach(() => jest.clearAllMocks());

  it('activates a DRAFT promotion', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(draftPromotion());
    mockedPrisma.promotion.update.mockResolvedValue(draftPromotion({ status: 'ACTIVE' }));
    const result = await activatePromotion('admin-1', 'promotion-1');
    expect(result.status).toBe('ACTIVE');
  });

  it('pauses an ACTIVE promotion', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(draftPromotion({ status: 'ACTIVE' }));
    mockedPrisma.promotion.update.mockResolvedValue(draftPromotion({ status: 'PAUSED' }));
    const result = await pausePromotion('admin-1', 'promotion-1');
    expect(result.status).toBe('PAUSED');
  });

  it('rejects archiving twice (already terminal)', async () => {
    mockedPrisma.promotion.findUnique.mockResolvedValue(draftPromotion({ status: 'ARCHIVED' }));
    await expect(archivePromotion('admin-1', 'promotion-1')).rejects.toThrow(
      InvalidPromotionStatusTransitionError,
    );
  });
});

describe('getPromotionAnalytics', () => {
  afterEach(() => jest.clearAllMocks());

  it('reports only real, DB-aggregated figures', async () => {
    mockedPrisma.promotion.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    mockedPrisma.promotionUsage.aggregate.mockResolvedValue({
      _count: 25,
      _sum: { discountAmount: new Prisma.Decimal('5000.0000') },
    });

    const analytics = await getPromotionAnalytics();

    expect(analytics.totalPromotions).toBe(10);
    expect(analytics.activePromotions).toBe(4);
    expect(analytics.totalRedemptions).toBe(25);
    expect(analytics.totalDiscountAmount).toBe('5000.0000');
  });
});
