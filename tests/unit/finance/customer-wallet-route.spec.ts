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

jest.mock('@/modules/finance/application/services/customer-wallet-service', () => ({
  getCustomerWallet: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/customer/wallet/route';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { getCustomerWallet } from '@/modules/finance/application/services/customer-wallet-service';

const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;
const mockedGetCustomerWallet = getCustomerWallet as jest.Mock;

const EMPTY_WALLET = {
  balance: '0.0000',
  currency: 'INR',
  summary: {
    totalCredits: '0.0000',
    totalDebits: '0.0000',
    totalRefunds: '0.0000',
    totalReferralRewards: '0.0000',
  },
  transactions: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
};

function requestWithQuery(query: string, roles: string[] | null = ['CUSTOMER']) {
  if (roles === null) {
    mockedGetPrincipal.mockResolvedValue(null);
  } else {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-1',
      accountStatus: 'ACTIVE',
      roles,
      permissions: ['payments.read'],
    });
  }
  return new NextRequest(`http://localhost:3000/api/customer/wallet${query}`, {
    headers: { authorization: 'Bearer mock-token' },
  });
}

describe('GET /api/customer/wallet — authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCustomerWallet.mockResolvedValue(EMPTY_WALLET);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await GET(requestWithQuery('', null));
    expect(res.status).toBe(401);
    expect(mockedGetCustomerWallet).not.toHaveBeenCalled();
  });

  it('rejects a DRIVER-only account with 403 — driver cannot access the customer wallet', async () => {
    const res = await GET(requestWithQuery('', ['DRIVER']));
    expect(res.status).toBe(403);
    expect(mockedGetCustomerWallet).not.toHaveBeenCalled();
  });

  it('rejects an ADMINISTRATOR-only account with 403 — admin must use existing admin finance APIs, not this customer endpoint', async () => {
    const res = await GET(requestWithQuery('', ['ADMINISTRATOR']));
    expect(res.status).toBe(403);
    expect(mockedGetCustomerWallet).not.toHaveBeenCalled();
  });

  it('allows a CUSTOMER account through and derives ownership only from the session principal', async () => {
    const res = await GET(requestWithQuery('', ['CUSTOMER']));
    expect(res.status).toBe(200);
    expect(mockedGetCustomerWallet).toHaveBeenCalledWith('customer-1', expect.anything());
  });

  it('ignores any customerId/userId supplied in the query string — ownership always comes from the session', async () => {
    await GET(requestWithQuery('?customerId=someone-else&userId=someone-else', ['CUSTOMER']));
    expect(mockedGetCustomerWallet).toHaveBeenCalledWith('customer-1', expect.anything());
  });
});

describe('GET /api/customer/wallet — query validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCustomerWallet.mockResolvedValue(EMPTY_WALLET);
  });

  it('rejects an invalid type filter with 400 INVALID_INPUT', async () => {
    const res = await GET(requestWithQuery('?type=not_a_real_filter'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(mockedGetCustomerWallet).not.toHaveBeenCalled();
  });

  it('rejects a pageSize above the maximum with 400', async () => {
    const res = await GET(requestWithQuery('?pageSize=100000'));
    expect(res.status).toBe(400);
    expect(mockedGetCustomerWallet).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric page with 400', async () => {
    const res = await GET(requestWithQuery('?page=not-a-number'));
    expect(res.status).toBe(400);
  });

  it('rejects a negative page with 400', async () => {
    const res = await GET(requestWithQuery('?page=-1'));
    expect(res.status).toBe(400);
  });

  it('passes valid page/pageSize/type through to the service', async () => {
    await GET(requestWithQuery('?page=2&pageSize=10&type=refund'));
    expect(mockedGetCustomerWallet).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({ page: 2, pageSize: 10, type: 'refund' }),
    );
  });

  it('defaults page/pageSize/type to undefined when omitted, letting the service apply defaults', async () => {
    await GET(requestWithQuery(''));
    expect(mockedGetCustomerWallet).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({ page: undefined, pageSize: undefined, type: undefined }),
    );
  });

  it('returns the service result wrapped in a { wallet } envelope', async () => {
    const res = await GET(requestWithQuery('', ['CUSTOMER']));
    const body = await res.json();
    expect(body).toEqual({ wallet: EMPTY_WALLET });
  });
});
