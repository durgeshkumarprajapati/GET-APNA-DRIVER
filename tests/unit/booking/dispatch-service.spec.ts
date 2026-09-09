import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import {
  reassignBookingDriver,
  restartBookingSearch,
  forceAssignDriver,
} from '@/modules/booking/application/dispatch-service';
import {
  BookingNotFoundError,
  DispatchInvalidBookingStateError,
  DriverNotAvailableForDispatchError,
  DriverNotEligibleForDispatchError,
} from '@/modules/booking/domain/errors';
import { ForbiddenError } from '@/modules/identity/domain/errors';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import {
  addDriverToLiveIndex,
  removeDriverFromLiveIndex,
} from '@/modules/location/application/driver-location-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { getInteger } from '@/shared/config/configuration-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

const mockTx = {
  booking: { findUnique: jest.fn(), update: jest.fn() },
  driverProfile: { update: jest.fn() },
  bookingAssignmentAttempt: { updateMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  bookingLog: { create: jest.fn() },
};

const mockDb = {
  $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  booking: { findUnique: jest.fn() },
  driverProfile: { findUnique: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockResolvedValue(300),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));
jest.mock('@/shared/realtime/realtime-provider', () => ({
  realtime: { publishBookingUpdate: jest.fn() },
}));
jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  getContactInfoForUsers: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));
jest.mock('@/modules/location/application/driver-location-service', () => ({
  addDriverToLiveIndex: jest.fn().mockResolvedValue(undefined),
  removeDriverFromLiveIndex: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [
    PERMISSIONS.DISPATCH_ASSIGNMENT_REASSIGN,
    PERMISSIONS.DISPATCH_BOOKING_OVERRIDE,
    PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE,
    PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS,
  ],
};

const noPermissionPrincipal: AuthenticatedPrincipal = {
  userId: 'operator-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.CUSTOMER],
  permissions: [],
};

const forceOnlyPrincipal: AuthenticatedPrincipal = {
  userId: 'operator-2',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE],
};

function stubGetDispatchDetail() {
  mockDb.booking.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.SEARCHING_DRIVER,
    driverProfile: null,
    assignmentAttempts: [],
    customerId: 'customer-1',
    pickupAddress: 'MG Road',
    pickupLabel: null,
    bookingType: 'ONE_WAY',
    requestedStartTime: null,
    searchStartedAt: null,
    assignedAt: null,
    expiresAt: null,
    createdAt: new Date(),
  });
}

describe('reassignBookingDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx));
    (getInteger as jest.Mock).mockResolvedValue(300);
    stubGetDispatchDetail();
  });

  it('rejects an actor without dispatch.assignment.reassign', async () => {
    await expect(
      reassignBookingDriver(
        { bookingId: 'booking-1', actor: noPermissionPrincipal, reason: 'test' },
        mockDb as never,
      ),
    ).rejects.toThrow(ForbiddenError);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('throws BookingNotFoundError when the booking does not exist', async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);

    await expect(
      reassignBookingDriver(
        { bookingId: 'missing', actor: adminPrincipal, reason: 'test' },
        mockDb as never,
      ),
    ).rejects.toThrow(BookingNotFoundError);
  });

  it('rejects reassignment when the booking is not DRIVER_ASSIGNED', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.SEARCHING_DRIVER,
      driverProfileId: null,
    });

    await expect(
      reassignBookingDriver(
        { bookingId: 'booking-1', actor: adminPrincipal, reason: 'test' },
        mockDb as never,
      ),
    ).rejects.toThrow(DispatchInvalidBookingStateError);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });

  it('releases the previous driver, reopens matching, and records audit/outbox', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.DRIVER_ASSIGNED,
      driverProfileId: 'driver-1',
    });

    await reassignBookingDriver(
      { bookingId: 'booking-1', actor: adminPrincipal, reason: 'customer complaint' },
      mockDb as never,
    );

    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'driver-1' },
      data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
    });
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.SEARCHING_DRIVER,
          driverProfileId: null,
          assignedAt: null,
        }),
      }),
    );
    expect(insertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ eventType: 'dispatch.driver.reassigned' }),
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ action: 'dispatch.driver.reassigned' }),
    );
    expect(evaluateDriverEligibility).toHaveBeenCalledWith('driver-1', mockDb);
    expect(addDriverToLiveIndex).toHaveBeenCalledWith('driver-1', mockDb);
    expect(findAndOfferNextDriver).toHaveBeenCalledWith('booking-1', mockDb);
  });

  it('does not re-index the previous driver if they are no longer eligible', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.DRIVER_ASSIGNED,
      driverProfileId: 'driver-1',
    });
    (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
      isEligible: false,
      reasons: ['Documents expired'],
    });

    await reassignBookingDriver(
      { bookingId: 'booking-1', actor: adminPrincipal, reason: 'test' },
      mockDb as never,
    );

    expect(addDriverToLiveIndex).not.toHaveBeenCalled();
  });
});

describe('restartBookingSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx));
    (getInteger as jest.Mock).mockResolvedValue(300);
    stubGetDispatchDetail();
  });

  it('rejects an actor without dispatch.booking.override', async () => {
    await expect(
      restartBookingSearch(
        { bookingId: 'booking-1', actor: noPermissionPrincipal, reason: 'test' },
        mockDb as never,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('refuses to restart a booking that is not EXPIRED (no duplicate active search)', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.SEARCHING_DRIVER,
    });

    await expect(
      restartBookingSearch(
        { bookingId: 'booking-1', actor: adminPrincipal, reason: 'test' },
        mockDb as never,
      ),
    ).rejects.toThrow(DispatchInvalidBookingStateError);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
  });

  it('moves an EXPIRED booking back to SEARCHING_DRIVER and resumes matching', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.EXPIRED,
    });

    await restartBookingSearch(
      { bookingId: 'booking-1', actor: adminPrincipal, reason: 'retry' },
      mockDb as never,
    );

    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BookingStatus.SEARCHING_DRIVER }),
      }),
    );
    expect(insertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ eventType: 'dispatch.search.restarted' }),
    );
    expect(findAndOfferNextDriver).toHaveBeenCalledWith('booking-1', mockDb);
  });
});

describe('forceAssignDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx));
    (evaluateDriverEligibility as jest.Mock).mockResolvedValue({ isEligible: true, reasons: [] });
    mockDb.driverProfile.findUnique.mockResolvedValue({
      id: 'driver-2',
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    });
    mockTx.bookingAssignmentAttempt.count.mockResolvedValue(0);
    stubGetDispatchDetail();
  });

  it('rejects an actor without dispatch.assignment.force', async () => {
    await expect(
      forceAssignDriver(
        {
          bookingId: 'booking-1',
          driverProfileId: 'driver-2',
          actor: noPermissionPrincipal,
          reason: 'test',
        },
        mockDb as never,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('refuses to assign a driver who is not AVAILABLE, with no override', async () => {
    mockDb.driverProfile.findUnique.mockResolvedValue({
      id: 'driver-2',
      availabilityStatus: DriverAvailabilityStatus.BUSY,
    });

    await expect(
      forceAssignDriver(
        {
          bookingId: 'booking-1',
          driverProfileId: 'driver-2',
          actor: adminPrincipal,
          reason: 'test',
        },
        mockDb as never,
      ),
    ).rejects.toThrow(DriverNotAvailableForDispatchError);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('refuses an ineligible driver without bypassEligibility', async () => {
    (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
      isEligible: false,
      reasons: ['Approval status is not APPROVED'],
    });

    await expect(
      forceAssignDriver(
        {
          bookingId: 'booking-1',
          driverProfileId: 'driver-2',
          actor: adminPrincipal,
          reason: 'test',
        },
        mockDb as never,
      ),
    ).rejects.toThrow(DriverNotEligibleForDispatchError);
  });

  it('requires the stronger eligibility-bypass permission even with bypassEligibility=true', async () => {
    (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
      isEligible: false,
      reasons: ['Approval status is not APPROVED'],
    });

    await expect(
      forceAssignDriver(
        {
          bookingId: 'booking-1',
          driverProfileId: 'driver-2',
          actor: forceOnlyPrincipal,
          reason: 'test',
          bypassEligibility: true,
        },
        mockDb as never,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('force-assigns an eligible, available driver: cancels pending attempts, creates an ACCEPTED attempt, releases the previous driver', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.DRIVER_ASSIGNED,
      driverProfileId: 'driver-1',
    });

    await forceAssignDriver(
      {
        bookingId: 'booking-1',
        driverProfileId: 'driver-2',
        actor: adminPrincipal,
        reason: 'operator override',
      },
      mockDb as never,
    );

    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'driver-1' },
      data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
    });
    expect(mockTx.bookingAssignmentAttempt.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1', status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });
    expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          driverProfileId: 'driver-2',
          status: AssignmentAttemptStatus.ACCEPTED,
        }),
      }),
    );
    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'driver-2' },
      data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
    });
    expect(removeDriverFromLiveIndex).toHaveBeenCalledWith('driver-2', mockDb);
    expect(insertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ eventType: 'dispatch.driver.force_assigned' }),
    );
  });

  it('rejects force-assign when the booking is in a non-assignable status', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.TRIP_COMPLETED,
      driverProfileId: null,
    });

    await expect(
      forceAssignDriver(
        {
          bookingId: 'booking-1',
          driverProfileId: 'driver-2',
          actor: adminPrincipal,
          reason: 'test',
        },
        mockDb as never,
      ),
    ).rejects.toThrow(DispatchInvalidBookingStateError);
  });
});

// Verifies contact enrichment is actually invoked for read paths (getContactInfoForUsers).
describe('getDispatchBookingDetail via dispatch mutations', () => {
  it('is called during forceAssignDriver to build the returned detail', async () => {
    mockDb.driverProfile.findUnique.mockResolvedValue({
      id: 'driver-2',
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    });
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.SEARCHING_DRIVER,
      driverProfileId: null,
    });
    mockTx.bookingAssignmentAttempt.count.mockResolvedValue(0);
    stubGetDispatchDetail();

    await forceAssignDriver(
      {
        bookingId: 'booking-1',
        driverProfileId: 'driver-2',
        actor: adminPrincipal,
        reason: 'test',
      },
      mockDb as never,
    );

    expect(getContactInfoForUsers).toHaveBeenCalled();
  });
});
