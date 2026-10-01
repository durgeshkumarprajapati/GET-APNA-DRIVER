import { NextRequest, type NextResponse } from 'next/server';
import type { AuthenticatedRouteHandler } from '@/modules/identity/authorization/route-guard';

jest.mock('@/modules/identity/authorization/route-guard', () => ({
  withAuth: <P>(handler: AuthenticatedRouteHandler<P>) => {
    return (req: NextRequest, routeContext: P): Promise<NextResponse> => {
      const principal = {
        userId: 'customer-1',
        accountStatus: 'ACTIVE' as const,
        roles: ['CUSTOMER'],
        permissions: [],
      };
      return handler(req, { principal }, routeContext);
    };
  },
}));

jest.mock('@/modules/activation/application/activation-tracking-service', () => ({
  recordCustomerActivationEvent: jest.fn(),
  isCustomerActivationEvent: jest.fn((value: unknown) => value === 'first_booking_flow_started'),
}));

import { POST } from '@/app/api/customer/activation/track/route';
import { recordCustomerActivationEvent } from '@/modules/activation/application/activation-tracking-service';

const mockRecordEvent = recordCustomerActivationEvent as jest.Mock;

function postRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/customer/activation/track', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/customer/activation/track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records the event for the authenticated principal and returns 200', async () => {
    const res = await POST(postRequest({ event: 'first_booking_flow_started' }), undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRecordEvent).toHaveBeenCalledWith('customer-1', 'first_booking_flow_started');
  });

  it('rejects an unrecognized event name with 400, without recording anything', async () => {
    const res = await POST(postRequest({ event: 'drop_all_tables' }), undefined);

    expect(res.status).toBe(400);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it('rejects a missing/malformed body with 400 rather than throwing', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/activation/track', {
      method: 'POST',
      body: 'not json',
    });

    const res = await POST(req, undefined);

    expect(res.status).toBe(400);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });
});
