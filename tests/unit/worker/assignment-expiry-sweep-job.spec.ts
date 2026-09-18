jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

import { runAssignmentExpirySweep } from '@/worker/jobs/assignment-expiry-sweep-job';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { AssignmentAttemptStatus } from '@prisma/client';

describe('runAssignmentExpirySweep', () => {
  const mockFindManyAttempts = jest.fn();
  const mockUpdateManyAttempts = jest.fn();
  const mockFindAndOfferNextDriver = findAndOfferNextDriver as jest.Mock;

  const mockDb = {
    bookingAssignmentAttempt: {
      findMany: mockFindManyAttempts,
      updateMany: mockUpdateManyAttempts,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAndOfferNextDriver.mockResolvedValue({ status: 'OFFERED' });
  });

  it('does nothing when there are no stale PENDING attempts', async () => {
    mockFindManyAttempts.mockResolvedValue([]);

    const result = await runAssignmentExpirySweep(mockDb as never);

    expect(result.sweptCount).toBe(0);
    expect(mockUpdateManyAttempts).not.toHaveBeenCalled();
    expect(mockFindAndOfferNextDriver).not.toHaveBeenCalled();
  });

  it('marks a silently-timed-out attempt EXPIRED and resumes matching for its booking', async () => {
    mockFindManyAttempts.mockResolvedValue([{ id: 'att-1', bookingId: 'bk-1' }]);
    mockUpdateManyAttempts.mockResolvedValue({ count: 1 });

    const result = await runAssignmentExpirySweep(mockDb as never);

    expect(result.sweptCount).toBe(1);
    expect(mockUpdateManyAttempts).toHaveBeenCalledWith({
      where: { id: 'att-1', status: AssignmentAttemptStatus.PENDING },
      data: expect.objectContaining({ status: AssignmentAttemptStatus.EXPIRED }),
    });
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledWith('bk-1', mockDb);
  });

  it('skips resuming matching when the driver already responded, beating the sweep to it', async () => {
    mockFindManyAttempts.mockResolvedValue([{ id: 'att-1', bookingId: 'bk-1' }]);
    // updateMany's WHERE (status: PENDING) no longer matches — the driver's
    // own accept/reject already flipped the row's status.
    mockUpdateManyAttempts.mockResolvedValue({ count: 0 });

    const result = await runAssignmentExpirySweep(mockDb as never);

    expect(result.sweptCount).toBe(0);
    expect(mockFindAndOfferNextDriver).not.toHaveBeenCalled();
  });

  it('continues sweeping remaining attempts even if one fails', async () => {
    mockFindManyAttempts.mockResolvedValue([
      { id: 'att-1', bookingId: 'bk-1' },
      { id: 'att-2', bookingId: 'bk-2' },
    ]);
    mockUpdateManyAttempts
      .mockRejectedValueOnce(new Error('db hiccup'))
      .mockResolvedValueOnce({ count: 1 });

    const result = await runAssignmentExpirySweep(mockDb as never);

    expect(result.sweptCount).toBe(1);
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledWith('bk-2', mockDb);
  });
});
