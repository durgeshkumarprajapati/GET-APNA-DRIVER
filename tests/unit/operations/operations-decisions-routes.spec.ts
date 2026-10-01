import { NextRequest } from 'next/server';

jest.mock('@/modules/identity/authorization/route-guard', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withPermission: (permission: string, handler: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req: any, routeContext?: any) => {
      const principal = {
        userId: 'admin-user-1',
        roles: ['ADMINISTRATOR'],
        permissions: [permission],
      };
      return handler(req, { principal }, routeContext);
    };
  },
}));

jest.mock('@/modules/operations', () => ({
  evaluateOperationsDecisions: jest.fn(),
  listOperationsDecisions: jest.fn(),
  updateOperationsDecisionStatus: jest.fn(),
}));

import { GET as listDecisionsRoute } from '@/app/api/admin/operations/decisions/route';
import { POST as dismissRoute } from '@/app/api/admin/operations/decisions/[decisionId]/dismiss/route';
import { POST as acknowledgeRoute } from '@/app/api/admin/operations/decisions/[decisionId]/acknowledge/route';
import {
  evaluateOperationsDecisions,
  listOperationsDecisions,
  updateOperationsDecisionStatus,
} from '@/modules/operations';

const mockEvaluate = evaluateOperationsDecisions as jest.Mock;
const mockList = listOperationsDecisions as jest.Mock;
const mockUpdateStatus = updateOperationsDecisionStatus as jest.Mock;

describe('Operations decisions routes — authorization & pass-through', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluate.mockResolvedValue([]);
    mockList.mockResolvedValue({ decisions: [], total: 0, page: 1, pageSize: 50 });
  });

  it('GET /decisions refreshes via evaluateOperationsDecisions, then reads persisted history filtered by status/severity', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/decisions?status=RESOLVED&severity=HIGH&page=2&pageSize=10',
    );

    const res = await listDecisionsRoute(req, undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith({
      status: 'RESOLVED',
      severity: 'HIGH',
      decisionType: undefined,
      page: 2,
      pageSize: 10,
    });
    expect(body.success).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it('GET /decisions treats "ALL" as no filter', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/decisions?status=ALL&severity=ALL',
    );

    await listDecisionsRoute(req, undefined);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined, severity: undefined }),
    );
  });

  it('GET /decisions degrades gracefully (200, empty list) if the refresh evaluation throws', async () => {
    mockEvaluate.mockRejectedValue(new Error('db unavailable'));
    const req = new NextRequest('http://localhost:3000/api/admin/operations/decisions');

    const res = await listDecisionsRoute(req, undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.decisions).toEqual([]);
  });

  it('POST /decisions/:id/dismiss forwards a trimmed reason from the request body', async () => {
    mockUpdateStatus.mockResolvedValue({ id: 'dec-1', status: 'DISMISSED' });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/decisions/dec-1/dismiss',
      {
        method: 'POST',
        body: JSON.stringify({ reason: '  false positive, ignore  ' }),
      },
    );

    const res = await dismissRoute(req, {
      params: Promise.resolve({ decisionId: 'dec-1' }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith('dec-1', 'DISMISSED', 'admin-user-1', undefined, {
      dismissalReason: 'false positive, ignore',
    });
  });

  it('POST /decisions/:id/dismiss omits dismissalReason when none is supplied', async () => {
    mockUpdateStatus.mockResolvedValue({ id: 'dec-1', status: 'DISMISSED' });
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/decisions/dec-1/dismiss',
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );

    await dismissRoute(req, { params: Promise.resolve({ decisionId: 'dec-1' }) });

    expect(mockUpdateStatus).toHaveBeenCalledWith('dec-1', 'DISMISSED', 'admin-user-1', undefined, {
      dismissalReason: undefined,
    });
  });

  it('POST /decisions/:id/acknowledge returns 404 when the decision does not exist', async () => {
    mockUpdateStatus.mockResolvedValue(null);
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/decisions/missing/acknowledge',
      { method: 'POST' },
    );

    const res = await acknowledgeRoute(req, { params: Promise.resolve({ decisionId: 'missing' }) });

    expect(res.status).toBe(404);
  });
});
