jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  getContactInfoForUsers: jest.fn(),
}));

import {
  listCustomers,
  getCustomerAdminDetail,
} from '@/modules/customer/application/customer-admin-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

function buildDb() {
  return {
    customerProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    booking: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
  };
}

describe('listCustomers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates, filters, and enriches results with contact info and counts', async () => {
    const db = buildDb();
    db.customerProfile.findMany.mockResolvedValue([
      {
        id: 'cp-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          accountStatus: 'ACTIVE',
          _count: { customerBookings: 3, payments: 2 },
        },
      },
    ]);
    db.customerProfile.count.mockResolvedValue(1);
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(
      new Map([['user-1', { email: 'c@example.com', phoneNumber: null }]]),
    );

    const result = await listCustomers({ search: 'John', page: 2, pageSize: 10 }, db as never);

    expect(result.total).toBe(1);
    expect(result.customers[0].user.email).toBe('c@example.com');
    expect(result.customers[0].bookingCount).toBe(3);
    expect(result.customers[0].paymentCount).toBe(2);
    expect(db.customerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('caps pageSize at 100 to avoid unbounded queries', async () => {
    const db = buildDb();
    db.customerProfile.findMany.mockResolvedValue([]);
    db.customerProfile.count.mockResolvedValue(0);
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(new Map());

    const result = await listCustomers({ pageSize: 5000 }, db as never);

    expect(result.pageSize).toBe(100);
    expect(db.customerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});

describe('getCustomerAdminDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the customer profile does not exist', async () => {
    const db = buildDb();
    db.customerProfile.findUnique.mockResolvedValue(null);

    const result = await getCustomerAdminDetail('missing', db as never);

    expect(result).toBeNull();
  });

  it('enriches the profile with contact info and recent booking/payment history', async () => {
    const db = buildDb();
    db.customerProfile.findUnique.mockResolvedValue({
      id: 'cp-1',
      userId: 'user-1',
      user: {
        id: 'user-1',
        accountStatus: 'ACTIVE',
        _count: { customerBookings: 1, payments: 1 },
      },
    });
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(
      new Map([['user-1', { email: 'c@example.com', phoneNumber: '+919876543210' }]]),
    );
    db.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        status: 'TRIP_COMPLETED',
        bookingType: 'ONE_WAY',
        pickupAddress: 'MG Road',
        createdAt: new Date('2026-01-01'),
      },
    ]);
    db.payment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        status: 'CAPTURED',
        amount: { toFixed: () => '500.0000' },
        currency: 'INR',
        createdAt: new Date('2026-01-01'),
      },
    ]);

    const result = await getCustomerAdminDetail('cp-1', db as never);

    expect(result?.user.email).toBe('c@example.com');
    expect(result?.recentBookings).toHaveLength(1);
    expect(result?.recentPayments[0].amount).toBe('500.0000');
  });
});
