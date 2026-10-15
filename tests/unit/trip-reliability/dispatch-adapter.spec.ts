const mockTx = {
  booking: { update: jest.fn().mockResolvedValue({}) },
  driverProfile: { update: jest.fn().mockResolvedValue({}) },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockResolvedValue(180),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { DispatchAdapter } from '@/modules/trip-reliability/adapters/dispatch-adapter';
import { prisma } from '@/shared/database/prisma';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';

describe('DispatchAdapter.restartDispatchSearch', () => {
  let adapter: DispatchAdapter;
  const mockFindAndOffer = findAndOfferNextDriver as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAndOffer.mockResolvedValue({ status: 'OFFERED' });
    adapter = new DispatchAdapter();
  });

  it('returns false for a booking that does not exist', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await adapter.restartDispatchSearch('missing');

    expect(result).toBe(false);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockFindAndOffer).not.toHaveBeenCalled();
  });

  it('restarts search from DRIVER_ASSIGNED (a valid state-machine transition), releases the previous driver, and actually re-triggers matching', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'DRIVER_ASSIGNED',
      driverProfileId: 'dp-old',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(true);
    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'dp-old' },
      data: { availabilityStatus: 'AVAILABLE' },
    });
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'SEARCHING_DRIVER', driverProfileId: null }),
      }),
    );
    // Regression: previously stopped after the status write and never
    // called this — meaning a stalled search was reported "recovered" and
    // the incident closed without ever actually being retried.
    expect(mockFindAndOffer).toHaveBeenCalledWith('b1');
  });

  // Regression: the ASSIGNMENT_TIMEOUT incident rule only ever fires while
  // status === SEARCHING_DRIVER (assignment-timeout-rule.ts). A same-status
  // transition is a no-op in the booking state machine, so this exact case
  // previously rewrote the row to the value it already had and reported
  // success without calling findAndOfferNextDriver at all — the bug this
  // whole function exists to fix.
  it('actually re-triggers matching even when already SEARCHING_DRIVER (the exact case the incident rule fires for)', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'SEARCHING_DRIVER',
      driverProfileId: null,
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(true);
    expect(mockTx.driverProfile.update).not.toHaveBeenCalled();
    expect(mockFindAndOffer).toHaveBeenCalledWith('b1');
  });

  it('refuses to resurrect an already-CANCELLED booking (state-machine violation)', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'CANCELLED',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(false);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockFindAndOffer).not.toHaveBeenCalled();
  });

  it('refuses to restart search on a completed trip', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'TRIP_COMPLETED',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(false);
    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockFindAndOffer).not.toHaveBeenCalled();
  });

  it('reports failure (not false success) when findAndOfferNextDriver itself throws', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'SEARCHING_DRIVER',
      driverProfileId: null,
    });
    mockFindAndOffer.mockRejectedValue(new Error('db hiccup'));

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(false);
  });
});
