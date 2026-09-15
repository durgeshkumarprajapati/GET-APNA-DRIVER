jest.mock('@/shared/config/env', () => ({
  env: {
    AUTH_SESSION_COOKIE_NAME: 'gad_session',
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}));

jest.mock('@/modules/identity/application/services/principal-service', () => ({
  getPrincipalFromSessionToken: jest.fn(),
}));

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    driverProfile: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    safetyIncident: {
      count: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { GET as liveOpsGet } from '@/app/api/admin/live-ops-console/route';
import { prisma } from '@/shared/database/prisma';

const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;

function makeReq(url = 'http://localhost:3000/api/admin/live-ops-console') {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      authorization: 'Bearer mock-token',
    },
  });
}

describe('Admin Live Ops Console API Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockedGetPrincipal.mockResolvedValue(null);
    const res = await liveOpsGet(makeReq());
    expect(res.status).toBe(401);
  });

  it('rejects non-admin role with 403 (RBAC enforcement)', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'driver-1',
      accountStatus: 'ACTIVE',
      roles: ['DRIVER'],
      permissions: ['driver.schedule.read'],
    });
    const res = await liveOpsGet(makeReq());
    expect(res.status).toBe(403);
  });

  it('allows ADMINISTRATOR with admin.driver.read permission and returns live ops telemetry', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'admin-1',
      accountStatus: 'ACTIVE',
      roles: ['ADMINISTRATOR'],
      permissions: ['admin.driver.read'],
    });

    (prisma.booking.count as jest.Mock).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    (prisma.driverProfile.count as jest.Mock)
      .mockResolvedValueOnce(10) // online
      .mockResolvedValueOnce(6) // available
      .mockResolvedValueOnce(4) // busy
      .mockResolvedValueOnce(20); // total approved
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValueOnce(1);
    (prisma.booking.findMany as jest.Mock)
      .mockResolvedValueOnce([{ totalFareAmount: 1500, platformCommissionAmount: 277.5 }]) // past 24h
      .mockResolvedValueOnce([]); // active bookings
    (prisma.driverProfile.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // online drivers
      .mockResolvedValueOnce([]); // pending kyc drivers

    const res = await liveOpsGet(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.metrics).toBeDefined();
    expect(json.metrics.activeDispatchGridCount).toBe(5);
    expect(json.metrics.driversOnlineCount).toBe(10);
    expect(json.metrics.activeSosCount).toBe(1);
  });
});
