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

jest.mock('@/modules/driver/application/services/driver-availability-service', () => ({
  getDriverAvailability: jest.fn().mockResolvedValue({}),
  setDriverAvailability: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({ id: 'profile-1' }),
  getOwnDriverProfileWithContact: jest.fn().mockResolvedValue({ id: 'profile-1' }),
  updateDriverProfile: jest.fn().mockResolvedValue({ id: 'profile-1' }),
}));
jest.mock('@/modules/driver/application/services/driver-document-service', () => ({
  listDriverDocuments: jest.fn().mockResolvedValue([]),
  registerUploadedDocument: jest.fn().mockResolvedValue({}),
  createDocumentUploadUrl: jest.fn().mockResolvedValue({}),
  getAuthorizedDocumentDownloadUrl: jest.fn().mockResolvedValue({ url: 'https://example.com' }),
}));
jest.mock('@/modules/driver/application/services/driver-onboarding-service', () => ({
  submitOnboarding: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/review/application/driver-portfolio-service', () => ({
  getDriverPortfolio: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/review/application/review-service', () => ({
  listDriverReviews: jest.fn().mockResolvedValue({ reviews: [], total: 0 }),
}));

import { NextRequest } from 'next/server';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { GET as availabilityGet } from '@/app/api/driver/availability/route';
import { GET as documentsGet } from '@/app/api/driver/documents/route';
import { POST as uploadUrlPost } from '@/app/api/driver/documents/upload-url/route';
import { GET as onboardingGet } from '@/app/api/driver/onboarding/route';
import { POST as onboardingSubmitPost } from '@/app/api/driver/onboarding/submit/route';
import { GET as profileGet } from '@/app/api/driver/profile/route';
import { GET as portfolioGet } from '@/app/api/driver/portfolio/route';
import { GET as reviewsGet } from '@/app/api/driver/reviews/route';
import { GET as documentDownloadUrlGet } from '@/app/api/driver/documents/[id]/download-url/route';

const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;

function req(url = 'http://localhost:3000/api/driver/x', body?: unknown) {
  return new NextRequest(url, {
    headers: {
      authorization: 'Bearer mock-token',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
}

/**
 * Phase 24 fix: these 7 routes previously used bare `withAuth` (or a
 * permission shared with CUSTOMER), letting any authenticated principal —
 * including a pure CUSTOMER with no DRIVER role — call them and
 * auto-vivify a DriverProfile for themselves. They now use
 * `withRole(SYSTEM_ROLE_CODES.DRIVER, ...)`. `body` is only used by the
 * "allows a DRIVER through" case, since the reject-path tests never reach
 * request-body parsing (the role guard runs first).
 */
const ROUTES: { name: string; handler: (req: NextRequest) => Promise<Response>; body?: unknown }[] =
  [
    { name: 'GET /api/driver/availability', handler: availabilityGet },
    { name: 'GET /api/driver/documents', handler: documentsGet },
    {
      name: 'POST /api/driver/documents/upload-url',
      handler: uploadUrlPost,
      body: {
        documentType: 'DRIVING_LICENSE',
        fileName: 'license.jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 1024,
      },
    },
    { name: 'GET /api/driver/onboarding', handler: onboardingGet },
    { name: 'POST /api/driver/onboarding/submit', handler: onboardingSubmitPost },
    { name: 'GET /api/driver/profile', handler: profileGet },
    { name: 'GET /api/driver/portfolio', handler: portfolioGet },
    { name: 'GET /api/driver/reviews', handler: reviewsGet },
  ];

describe('Driver-only route gate (Phase 24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(ROUTES)('$name rejects an unauthenticated request with 401', async ({ handler }) => {
    mockedGetPrincipal.mockResolvedValue(null);
    const res = await handler(req());
    expect(res.status).toBe(401);
  });

  it.each(ROUTES)(
    '$name rejects a CUSTOMER-only account with 403 — a customer must not reach a driver-only endpoint',
    async ({ handler }) => {
      mockedGetPrincipal.mockResolvedValue({
        userId: 'customer-1',
        accountStatus: 'ACTIVE',
        roles: ['CUSTOMER'],
        permissions: ['users.profile.read', 'reviews.read'],
      });
      const res = await handler(req());
      expect(res.status).toBe(403);
    },
  );

  it.each(ROUTES)('$name allows a DRIVER account through', async ({ handler, body }) => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'driver-1',
      accountStatus: 'ACTIVE',
      roles: ['DRIVER'],
      permissions: [],
    });
    const res = await handler(req('http://localhost:3000/api/driver/x', body));
    expect(res.status).toBeLessThan(400);
  });
});

describe('GET /api/driver/documents/[id]/download-url — driver-only route gate (Phase 24)', () => {
  const routeContext = { params: Promise.resolve({ id: 'doc-1' }) };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unauthenticated request with 401', async () => {
    mockedGetPrincipal.mockResolvedValue(null);
    const res = await documentDownloadUrlGet(req(), routeContext);
    expect(res.status).toBe(401);
  });

  it('rejects a CUSTOMER-only account with 403', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-1',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });
    const res = await documentDownloadUrlGet(req(), routeContext);
    expect(res.status).toBe(403);
  });

  it('allows a DRIVER account through', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'driver-1',
      accountStatus: 'ACTIVE',
      roles: ['DRIVER'],
      permissions: [],
    });
    const res = await documentDownloadUrlGet(req(), routeContext);
    expect(res.status).toBeLessThan(400);
  });
});
