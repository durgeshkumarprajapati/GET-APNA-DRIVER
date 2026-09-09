jest.mock('@/shared/config/env', () => ({
  env: {
    AUTH_SESSION_COOKIE_NAME: 'gad_session',
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
  },
}));

jest.mock('@/modules/identity/application/services/principal-service', () => ({
  getPrincipalFromSessionToken: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole, withPermission } from '@/modules/identity/authorization/route-guard';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';

describe('Route Guard Authorization Middlewares', () => {
  const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated request with 401 status', async () => {
    mockedGetPrincipal.mockResolvedValue(null);

    const handler = withAuth(async () => NextResponse.json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/protected');

    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('allows active authenticated principal through withAuth', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'user-1',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: ['rides.read'],
    });

    const handler = withAuth(async (_req, { principal }) =>
      NextResponse.json({ userId: principal.userId }),
    );
    const req = new NextRequest('http://localhost:3000/api/protected', {
      headers: { authorization: 'Bearer mock-token' },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string };
    expect(body.userId).toBe('user-1');
  });

  it('rejects suspended account with 403 status', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'user-2',
      accountStatus: 'SUSPENDED',
      roles: ['CUSTOMER'],
      permissions: [],
    });

    const handler = withAuth(async () => NextResponse.json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/protected', {
      headers: { authorization: 'Bearer mock-token' },
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
  });

  it('enforces role check with withRole', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'user-1',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });

    const adminHandler = withRole('ADMINISTRATOR', async () => NextResponse.json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/admin', {
      headers: { authorization: 'Bearer mock-token' },
    });

    const res = await adminHandler(req);
    expect(res.status).toBe(403);
  });

  it('enforces permission check with withPermission', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'user-1',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: ['rides.read'],
    });

    const writeHandler = withPermission('rides.write', async () => NextResponse.json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/rides', {
      headers: { authorization: 'Bearer mock-token' },
    });

    const res = await writeHandler(req);
    expect(res.status).toBe(403);
  });
});
