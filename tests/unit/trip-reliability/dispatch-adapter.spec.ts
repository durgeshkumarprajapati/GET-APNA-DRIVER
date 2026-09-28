import { DispatchAdapter } from '@/modules/trip-reliability/adapters/dispatch-adapter';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('DispatchAdapter.restartDispatchSearch', () => {
  let adapter: DispatchAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new DispatchAdapter();
  });

  it('returns false for a booking that does not exist', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await adapter.restartDispatchSearch('missing');

    expect(result).toBe(false);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('restarts search from DRIVER_ASSIGNED (a valid state-machine transition)', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'DRIVER_ASSIGNED',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(true);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'SEARCHING_DRIVER', driverProfileId: null },
      }),
    );
  });

  it('is idempotent when already SEARCHING_DRIVER', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'SEARCHING_DRIVER',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(true);
  });

  it('refuses to resurrect an already-CANCELLED booking (state-machine violation)', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'CANCELLED',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(false);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('refuses to restart search on a completed trip', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'TRIP_COMPLETED',
    });

    const result = await adapter.restartDispatchSearch('b1');

    expect(result).toBe(false);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});
