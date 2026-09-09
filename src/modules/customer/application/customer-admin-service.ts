import 'server-only';
import type { AccountStatus, CustomerProfile, User } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

export type CustomerProfileWithContact = CustomerProfile & {
  user: User & { email: string | null; phoneNumber: string | null };
  bookingCount: number;
  paymentCount: number;
};

export interface ListCustomersFilter {
  accountStatus?: AccountStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCustomersResult {
  customers: CustomerProfileWithContact[];
  total: number;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * Admin-facing customer directory. Mirrors `listDriverApplications` in the
 * driver module: paginated, searchable by name, enriched with contact info
 * resolved from UserIdentity (User itself carries none).
 */
export async function listCustomers(
  filter: ListCustomersFilter = {},
  db: Db = prisma,
): Promise<ListCustomersResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize =
    filter.pageSize && filter.pageSize > 0
      ? Math.min(filter.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const where = {
    ...(filter.accountStatus ? { user: { accountStatus: filter.accountStatus } } : {}),
    ...(filter.search
      ? {
          OR: [
            { firstName: { contains: filter.search, mode: 'insensitive' as const } },
            { lastName: { contains: filter.search, mode: 'insensitive' as const } },
            { displayName: { contains: filter.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [profiles, total] = await Promise.all([
    db.customerProfile.findMany({
      where,
      include: {
        user: {
          include: {
            _count: { select: { customerBookings: true, payments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.customerProfile.count({ where }),
  ]);

  const userIds = profiles.map((profile) => profile.userId);
  const contactInfo = await getContactInfoForUsers(db, userIds);

  const customers: CustomerProfileWithContact[] = profiles.map((profile) => {
    const { _count, ...user } = profile.user;
    return {
      ...profile,
      user: {
        ...user,
        ...(contactInfo.get(profile.userId) ?? { email: null, phoneNumber: null }),
      },
      bookingCount: _count.customerBookings,
      paymentCount: _count.payments,
    };
  });

  return { customers, total, page, pageSize };
}

export interface CustomerAdminDetail extends CustomerProfileWithContact {
  recentBookings: {
    id: string;
    status: string;
    bookingType: string;
    pickupAddress: string;
    createdAt: Date;
  }[];
  recentPayments: {
    id: string;
    status: string;
    amount: string;
    currency: string;
    createdAt: Date;
  }[];
}

const RECENT_ITEMS_LIMIT = 10;

/**
 * Admin-facing customer detail: profile, contact info, and the most recent
 * bookings/payments. Read-only — never mutates account state (see
 * `account-status-service.ts` for the actual status transition path).
 */
export async function getCustomerAdminDetail(
  customerProfileId: string,
  db: Db = prisma,
): Promise<CustomerAdminDetail | null> {
  const profile = await db.customerProfile.findUnique({
    where: { id: customerProfileId },
    include: {
      user: {
        include: {
          _count: { select: { customerBookings: true, payments: true } },
        },
      },
    },
  });
  if (!profile) {
    return null;
  }

  const contactInfo = await getContactInfoForUsers(db, [profile.userId]);
  const { _count, ...user } = profile.user;

  const [recentBookings, recentPayments] = await Promise.all([
    db.booking.findMany({
      where: { customerId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ITEMS_LIMIT,
      select: { id: true, status: true, bookingType: true, pickupAddress: true, createdAt: true },
    }),
    db.payment.findMany({
      where: { customerId: profile.userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ITEMS_LIMIT,
      select: { id: true, status: true, amount: true, currency: true, createdAt: true },
    }),
  ]);

  return {
    ...profile,
    user: {
      ...user,
      ...(contactInfo.get(profile.userId) ?? { email: null, phoneNumber: null }),
    },
    bookingCount: _count.customerBookings,
    paymentCount: _count.payments,
    recentBookings,
    recentPayments: recentPayments.map((payment) => ({
      ...payment,
      amount: payment.amount.toFixed(4),
    })),
  };
}
