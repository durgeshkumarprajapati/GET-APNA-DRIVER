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

jest.mock('@/modules/driver/application/services/driver-schedule-service', () => ({
  driverScheduleService: {
    getDriverSchedule: jest.fn().mockResolvedValue({ weeklySchedule: [], exceptions: [] }),
    upsertDriverWeeklySchedule: jest.fn().mockResolvedValue([]),
    createScheduleException: jest.fn().mockResolvedValue({}),
    deleteScheduleException: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({ id: 'driver-profile-1' }),
}));

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'driver-profile-1', userId: 'driver-user-1' }),
    },
  },
}));

import { NextRequest } from 'next/server';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { GET as driverScheduleGet, POST as driverSchedulePost } from '@/app/api/driver/schedule/route';
import { GET as adminScheduleGet, PATCH as adminSchedulePatch } from '@/app/api/admin/drivers/[driverId]/schedule/route';

const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;

function makeReq(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      authorization: 'Bearer mock-token',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Driver Schedule RBAC & IDOR Security Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Driver Schedule Routes RBAC (/api/driver/schedule)', () => {
    it('GET /api/driver/schedule rejects unauthenticated request with 401', async () => {
      mockedGetPrincipal.mockResolvedValue(null);
      const res = await driverScheduleGet(makeReq('http://localhost:3000/api/driver/schedule'));
      expect(res.status).toBe(401);
    });

    it('GET /api/driver/schedule rejects CUSTOMER without permission with 403', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'customer-1',
        accountStatus: 'ACTIVE',
        roles: ['CUSTOMER'],
        permissions: ['customer.booking.read'],
      });
      const res = await driverScheduleGet(makeReq('http://localhost:3000/api/driver/schedule'));
      expect(res.status).toBe(403);
    });

    it('GET /api/driver/schedule allows DRIVER with driver.schedule.read permission', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'driver-1',
        accountStatus: 'ACTIVE',
        roles: ['DRIVER'],
        permissions: ['driver.schedule.read'],
      });
      const res = await driverScheduleGet(makeReq('http://localhost:3000/api/driver/schedule'));
      expect(res.status).toBe(200);
    });

    it('POST /api/driver/schedule rejects CUSTOMER with 403', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'customer-1',
        accountStatus: 'ACTIVE',
        roles: ['CUSTOMER'],
        permissions: ['customer.booking.read'],
      });
      const res = await driverSchedulePost(
        makeReq('http://localhost:3000/api/driver/schedule', 'POST', {
          entries: [
            {
              dayOfWeek: 'MONDAY',
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Admin Driver Schedule Routes RBAC (/api/admin/drivers/[driverId]/schedule)', () => {
    const routeContext = { params: Promise.resolve({ driverId: 'driver-profile-1' }) };

    it('GET rejects DRIVER without admin permission with 403', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'driver-1',
        accountStatus: 'ACTIVE',
        roles: ['DRIVER'],
        permissions: ['driver.schedule.read'],
      });
      const res = await adminScheduleGet(
        makeReq('http://localhost:3000/api/admin/drivers/driver-profile-1/schedule'),
        routeContext,
      );
      expect(res.status).toBe(403);
    });

    it('GET allows ADMINISTRATOR with admin.driver.schedule.read permission', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'admin-1',
        accountStatus: 'ACTIVE',
        roles: ['ADMINISTRATOR'],
        permissions: ['admin.driver.schedule.read'],
      });
      const res = await adminScheduleGet(
        makeReq('http://localhost:3000/api/admin/drivers/driver-profile-1/schedule'),
        routeContext,
      );
      expect(res.status).toBe(200);
    });

    it('PATCH rejects DRIVER without admin permission with 403', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'driver-1',
        accountStatus: 'ACTIVE',
        roles: ['DRIVER'],
        permissions: ['driver.schedule.manage'],
      });
      const res = await adminSchedulePatch(
        makeReq('http://localhost:3000/api/admin/drivers/driver-profile-1/schedule', 'PATCH', {
          entries: [
            {
              dayOfWeek: 'MONDAY',
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
        }),
        routeContext,
      );
      expect(res.status).toBe(403);
    });

    it('PATCH allows ADMINISTRATOR with admin.driver.schedule.manage permission', async () => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'admin-1',
        accountStatus: 'ACTIVE',
        roles: ['ADMINISTRATOR'],
        permissions: ['admin.driver.schedule.manage'],
      });
      const res = await adminSchedulePatch(
        makeReq('http://localhost:3000/api/admin/drivers/driver-profile-1/schedule', 'PATCH', {
          entries: [
            {
              dayOfWeek: 'MONDAY',
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
        }),
        routeContext,
      );
      expect(res.status).toBe(200);
    });
  });
});
